import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NotificationApi } from './api.js';
import './mute-list.js';
import type { MuteList } from './mute-list.js';
import type { MuteRule, MuteRuleInput } from './types.js';

function waitUntil(condition: () => boolean, message = '', timeout = 1000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (condition()) resolve();
      else if (Date.now() - start > timeout) reject(new Error(message || 'Timeout'));
      else setTimeout(check, 10);
    };
    check();
  });
}

const mockRules: MuteRule[] = [
  {
    id: 'mute-1',
    userId: 'user-1',
    tenancyId: 'tenant-1',
    scope: 'ENTITY',
    scopeId: 'issue-42',
    entityType: 'issue',
    createdAt: '2026-07-01T10:00:00Z',
    expiresAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'mute-2',
    userId: 'user-1',
    tenancyId: 'tenant-1',
    scope: 'CATEGORY',
    scopeId: 'marketing',
    entityType: null,
    createdAt: '2026-07-02T14:00:00Z',
    expiresAt: null,
  },
];

function createMockApi(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    listMuteRules: async () => mockRules,
    addMuteRule: async (input: MuteRuleInput) => ({
      id: 'mute-new',
      ...input,
      createdAt: '2026-07-21T10:00:00Z',
    }),
    removeMuteRule: async (_id: string) => {},
    ...overrides,
  } as unknown as NotificationApi;
}

describe('mute-list', () => {
  let el: MuteList;

  beforeEach(async () => {
    el = document.createElement('mute-list') as MuteList;
    el.endpoint = 'http://localhost/api';
    el.api = createMockApi();
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => el.remove());

  it('fetches and renders rules in table', async () => {
    await waitUntil(() => !el.loading, 'loaded');
    await el.updateComplete;
    const table = el.shadowRoot!.querySelector('pages-table');
    expect(table).toBeTruthy();
    expect(el.rules).toHaveLength(2);
  });

  it('shows add form when add button is clicked', async () => {
    await waitUntil(() => !el.loading);
    await el.updateComplete;

    const addBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('.btn-add');
    expect(addBtn).toBeTruthy();
    addBtn!.click();
    await el.updateComplete;

    const form = el.shadowRoot!.querySelector('pages-schema-form');
    expect(form).toBeTruthy();
  });

  it('calls addMuteRule on form submit', async () => {
    let addCalled = false;
    el.api = createMockApi({
      addMuteRule: async (input: MuteRuleInput) => {
        addCalled = true;
        expect(input.scope).toBe('ENTITY');
        expect(input.scopeId).toBe('issue-99');
        return { id: 'mute-new', ...input, createdAt: '' };
      },
    });
    await waitUntil(() => !el.loading);
    await el.updateComplete;

    el.showAddForm = true;
    el.addFormData = {
      scope: 'ENTITY',
      scopeId: 'issue-99',
      entityType: 'issue',
      expiresAt: '',
    };
    await el.submitAdd();
    expect(addCalled).toBe(true);
  });

  it('emits mute.created event on add', async () => {
    await waitUntil(() => !el.loading);
    let eventFired = false;
    el.addEventListener('pages-event', ((e: CustomEvent) => {
      if (e.detail.topic === 'mute.created') eventFired = true;
    }) as EventListener);

    el.showAddForm = true;
    el.addFormData = { scope: 'ENTITY', scopeId: 'test', entityType: '', expiresAt: '' };
    await el.submitAdd();
    expect(eventFired).toBe(true);
  });

  it('shows confirm dialog before remove', async () => {
    await waitUntil(() => !el.loading);
    await el.updateComplete;

    el.handleRemove('mute-1');
    await el.updateComplete;

    const dialog = el.shadowRoot!.querySelector('blocks-confirm-dialog');
    expect(dialog).toBeTruthy();
    expect(dialog!.open).toBe(true);
  });

  it('removes rule after confirmation', async () => {
    let removeCalled = false;
    el.api = createMockApi({
      removeMuteRule: async (id: string) => {
        removeCalled = true;
        expect(id).toBe('mute-1');
      },
    });
    await waitUntil(() => !el.loading);
    await el.updateComplete;

    el.handleRemove('mute-1');
    await el.confirmRemove();
    expect(removeCalled).toBe(true);
    expect(el.rules.find(r => r.id === 'mute-1')).toBeUndefined();
  });

  it('emits mute.deleted event on remove', async () => {
    await waitUntil(() => !el.loading);
    let eventFired = false;
    el.addEventListener('pages-event', ((e: CustomEvent) => {
      if (e.detail.topic === 'mute.deleted') eventFired = true;
    }) as EventListener);

    el.handleRemove('mute-1');
    await el.confirmRemove();
    expect(eventFired).toBe(true);
  });

  it('shows error on fetch failure', async () => {
    el.remove();
    el = document.createElement('mute-list') as MuteList;
    el.endpoint = 'http://localhost/api';
    el.api = createMockApi({
      listMuteRules: async () => { throw new Error('Network error'); },
    });
    document.body.appendChild(el);
    await el.updateComplete;
    await waitUntil(() => el.error != null, 'error set');
    expect(el.shadowRoot!.textContent).toContain('Network error');
  });
});
