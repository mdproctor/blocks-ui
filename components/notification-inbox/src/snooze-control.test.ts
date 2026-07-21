import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NotificationApi } from './api.js';
import './snooze-control.js';
import type { SnoozeControl } from './snooze-control.js';
import type { Snooze } from './types.js';

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

const mockSnooze: Snooze = {
  userId: 'user-1',
  tenancyId: 'tenant-1',
  until: '2026-07-22T10:00:00Z',
  createdAt: '2026-07-21T08:00:00Z',
};

function createMockApi(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    getSnooze: async () => null,
    activateSnooze: async (until: string) => ({
      userId: 'user-1',
      tenancyId: 'tenant-1',
      until,
      createdAt: '2026-07-21T10:00:00Z',
    }),
    cancelSnooze: async () => {},
    ...overrides,
  } as unknown as NotificationApi;
}

describe('snooze-control', () => {
  let el: SnoozeControl;

  beforeEach(async () => {
    el = document.createElement('snooze-control') as SnoozeControl;
    el.endpoint = 'http://localhost/api';
    el.api = createMockApi();
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => el.remove());

  it('shows activate form when not snoozed', async () => {
    await waitUntil(() => !el.loading, 'loaded');
    await el.updateComplete;
    const form = el.shadowRoot!.querySelector('pages-schema-form');
    expect(form).toBeTruthy();
    expect(el.shadowRoot!.textContent).toContain('Activate');
  });

  it('shows snoozed state with cancel button when snoozed', async () => {
    el.remove();
    el = document.createElement('snooze-control') as SnoozeControl;
    el.endpoint = 'http://localhost/api';
    el.api = createMockApi({ getSnooze: async () => mockSnooze });
    document.body.appendChild(el);
    await el.updateComplete;
    await waitUntil(() => !el.loading, 'loaded');
    await el.updateComplete;

    expect(el.shadowRoot!.textContent).toContain('Snoozed');
    expect(el.shadowRoot!.textContent).toContain('Cancel');
    expect(el.shadowRoot!.querySelector('pages-schema-form')).toBeNull();
  });

  it('activates snooze on form submit', async () => {
    let activateCalled = false;
    el.api = createMockApi({
      activateSnooze: async (until: string) => {
        activateCalled = true;
        expect(until).toBe('2026-07-25T18:00');
        return { userId: 'user-1', tenancyId: 'tenant-1', until, createdAt: '' };
      },
    });
    await waitUntil(() => !el.loading);
    el.snoozeUntil = '2026-07-25T18:00';
    await el.activate();
    expect(activateCalled).toBe(true);
  });

  it('emits snooze.activated event', async () => {
    await waitUntil(() => !el.loading);
    let eventFired = false;
    el.addEventListener('pages-event', ((e: CustomEvent) => {
      if (e.detail.topic === 'snooze.activated') eventFired = true;
    }) as EventListener);

    el.snoozeUntil = '2026-07-25T18:00';
    await el.activate();
    expect(eventFired).toBe(true);
  });

  it('cancels snooze and returns to activate form', async () => {
    el.remove();
    el = document.createElement('snooze-control') as SnoozeControl;
    el.endpoint = 'http://localhost/api';
    let cancelCalled = false;
    el.api = createMockApi({
      getSnooze: async () => mockSnooze,
      cancelSnooze: async () => { cancelCalled = true; },
    });
    document.body.appendChild(el);
    await el.updateComplete;
    await waitUntil(() => !el.loading);

    await el.cancelSnooze();
    expect(cancelCalled).toBe(true);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('pages-schema-form')).toBeTruthy();
  });

  it('emits snooze.cancelled event', async () => {
    el.remove();
    el = document.createElement('snooze-control') as SnoozeControl;
    el.endpoint = 'http://localhost/api';
    el.api = createMockApi({ getSnooze: async () => mockSnooze });
    document.body.appendChild(el);
    await el.updateComplete;
    await waitUntil(() => !el.loading);

    let eventFired = false;
    el.addEventListener('pages-event', ((e: CustomEvent) => {
      if (e.detail.topic === 'snooze.cancelled') eventFired = true;
    }) as EventListener);

    await el.cancelSnooze();
    expect(eventFired).toBe(true);
  });

  it('shows error on fetch failure', async () => {
    el.remove();
    el = document.createElement('snooze-control') as SnoozeControl;
    el.endpoint = 'http://localhost/api';
    el.api = createMockApi({ getSnooze: async () => { throw new Error('Network error'); } });
    document.body.appendChild(el);
    await el.updateComplete;
    await waitUntil(() => el.error != null, 'error set');
    expect(el.shadowRoot!.textContent).toContain('Network error');
  });
});
