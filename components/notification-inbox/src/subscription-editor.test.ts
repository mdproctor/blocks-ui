import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotificationApi } from './api.js';
import './subscription-editor.js';
import type { SubscriptionEditor } from './subscription-editor.js';
import type { Subscription, EventTypeDescriptor, SubscriptionInput } from './types.js';

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

const mockEventTypes: EventTypeDescriptor[] = [
  {
    eventType: 'issue.updated',
    displayName: 'Issue Updated',
    description: 'Fires when an issue is updated',
    fields: [
      { name: 'issueId', type: 'string', description: 'Issue identifier' },
      { name: 'assigneeId', type: 'string', description: 'Assigned user' },
      { name: 'status', type: 'string', description: 'Issue status' },
    ],
  },
  {
    eventType: 'pr.created',
    displayName: 'Pull Request Created',
    description: 'Fires when a PR is created',
    fields: [
      { name: 'prId', type: 'string', description: 'PR identifier' },
      { name: 'author', type: 'string', description: 'PR author' },
    ],
  },
];

const mockSubscription: Subscription = {
  id: 'sub-1',
  ownerId: 'user-1',
  tenancyId: 'tenant-1',
  name: 'My Sub',
  eventType: 'issue.updated',
  constraints: [{ field: 'assigneeId', op: 'EQ', value: '$me' }],
  targets: [{ type: 'USER', id: 'user-1' }],
  includeActor: false,
  template: {
    titlePattern: 'Issue ${issueId} updated',
    bodyPattern: null,
    severity: 'INFO',
    category: 'issues',
    actionUrlPattern: '/issues/${issueId}',
    entityType: 'issue',
    entityIdField: 'issueId',
    actorIdField: 'assigneeId',
  },
  enabled: true,
  createdAt: '2026-07-01T10:00:00Z',
  updatedAt: '2026-07-01T10:00:00Z',
};

function createMockApi(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    getEventTypes: async () => mockEventTypes,
    createSubscription: async (input: SubscriptionInput) => ({
      id: 'sub-new',
      ...input,
      enabled: true,
      createdAt: '2026-07-21T10:00:00Z',
      updatedAt: '2026-07-21T10:00:00Z',
    }),
    updateSubscription: async (id: string, update: unknown) => ({
      ...mockSubscription,
      ...(update as object),
      id,
    }),
    ...overrides,
  } as unknown as NotificationApi;
}

describe('subscription-editor', () => {
  let el: SubscriptionEditor;

  beforeEach(async () => {
    el = document.createElement('subscription-editor') as SubscriptionEditor;
    el.endpoint = 'http://localhost/api';
    el.api = createMockApi();
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => el.remove());

  it('fetches event types on connect and renders form', async () => {
    await waitUntil(() => !el.loading, 'event types loaded');
    await el.updateComplete;
    const form = el.shadowRoot!.querySelector('pages-schema-form');
    expect(form).toBeTruthy();
  });

  it('populates event type dropdown from API', async () => {
    await waitUntil(() => !el.loading);
    await el.updateComplete;
    const form = el.shadowRoot!.querySelector('pages-schema-form') as any;
    const eventTypeField = form.schema.properties.eventType;
    expect(eventTypeField.oneOf).toHaveLength(2);
    expect(eventTypeField.oneOf[0].const).toBe('issue.updated');
    expect(eventTypeField.oneOf[0].title).toBe('Issue Updated');
  });

  it('rebuilds constraint field options when event type changes', async () => {
    await waitUntil(() => !el.loading);
    await el.updateComplete;

    el.handleFormChange(new CustomEvent('pages-form-change', {
      detail: { key: 'eventType', value: 'issue.updated', data: { eventType: 'issue.updated' } },
    }));
    await el.updateComplete;

    const form = el.shadowRoot!.querySelector('pages-schema-form') as any;
    const constraintFieldSchema = form.schema.properties.constraints.items.properties.field;
    expect(constraintFieldSchema.oneOf).toHaveLength(3);
    expect(constraintFieldSchema.oneOf[0].const).toBe('issueId');
  });

  it('rebuilds entityIdField and actorIdField on event type change', async () => {
    await waitUntil(() => !el.loading);
    await el.updateComplete;

    el.handleFormChange(new CustomEvent('pages-form-change', {
      detail: { key: 'eventType', value: 'pr.created', data: { eventType: 'pr.created' } },
    }));
    await el.updateComplete;

    const form = el.shadowRoot!.querySelector('pages-schema-form') as any;
    const entityIdField = form.schema.properties.template.properties.entityIdField;
    expect(entityIdField.oneOf).toHaveLength(2);
    expect(entityIdField.oneOf[0].const).toBe('prId');
  });

  it('pre-populates form in edit mode', async () => {
    el.remove();
    el = document.createElement('subscription-editor') as SubscriptionEditor;
    el.endpoint = 'http://localhost/api';
    el.api = createMockApi();
    el.subscription = mockSubscription;
    document.body.appendChild(el);
    await el.updateComplete;
    await waitUntil(() => !el.loading);
    await el.updateComplete;

    const form = el.shadowRoot!.querySelector('pages-schema-form') as any;
    expect(form.data.name).toBe('My Sub');
    expect(form.data.eventType).toBe('issue.updated');
    expect(form.data.constraints).toHaveLength(1);
  });

  it('calls createSubscription on save in create mode', async () => {
    let createCalled = false;
    el.api = createMockApi({
      createSubscription: async (input: SubscriptionInput) => {
        createCalled = true;
        expect(input.name).toBeTruthy();
        return { id: 'new', ...input, enabled: true, createdAt: '', updatedAt: '' };
      },
    });
    el.identity = { userId: 'user-1', tenancyId: 'tenant-1' };
    await waitUntil(() => !el.loading);
    await el.updateComplete;

    el.formData = {
      name: 'Test',
      eventType: 'issue.updated',
      constraints: [],
      targets: [{ type: 'USER' as const, id: 'user-1' }],
      includeActor: false,
      template: {
        titlePattern: 'T',
        bodyPattern: null,
        severity: 'INFO' as const,
        category: 'c',
        actionUrlPattern: null,
        entityType: 'e',
        entityIdField: 'f',
        actorIdField: 'a',
      },
    };
    await el.save();
    expect(createCalled).toBe(true);
  });

  it('emits save event after successful create', async () => {
    el.identity = { userId: 'user-1', tenancyId: 'tenant-1' };
    await waitUntil(() => !el.loading);

    let saveFired = false;
    el.addEventListener('save', () => { saveFired = true; });

    el.formData = {
      name: 'Test',
      eventType: 'issue.updated',
      constraints: [],
      targets: [{ type: 'USER' as const, id: 'user-1' }],
      includeActor: false,
      template: {
        titlePattern: 'T',
        bodyPattern: null,
        severity: 'INFO' as const,
        category: 'c',
        actionUrlPattern: null,
        entityType: 'e',
        entityIdField: 'f',
        actorIdField: 'a',
      },
    };
    await el.save();
    expect(saveFired).toBe(true);
  });

  it('emits cancel event on cancel', async () => {
    let cancelFired = false;
    el.addEventListener('cancel', () => { cancelFired = true; });
    el.cancel();
    expect(cancelFired).toBe(true);
  });

  it('shows error on event types fetch failure', async () => {
    el.remove();
    el = document.createElement('subscription-editor') as SubscriptionEditor;
    el.endpoint = 'http://localhost/api';
    el.api = createMockApi({
      getEventTypes: async () => { throw new Error('Network error'); },
    });
    document.body.appendChild(el);
    await el.updateComplete;
    await waitUntil(() => el.error != null, 'error set');
    expect(el.shadowRoot!.textContent).toContain('Network error');
  });

  it('shows loading state while fetching event types', async () => {
    el.remove();
    let resolveTypes!: (value: EventTypeDescriptor[]) => void;
    const delayedApi = createMockApi({
      getEventTypes: () => new Promise<EventTypeDescriptor[]>(resolve => { resolveTypes = resolve; }),
    });
    el = document.createElement('subscription-editor') as SubscriptionEditor;
    el.endpoint = 'http://localhost/api';
    el.api = delayedApi;
    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.loading).toBe(true);
    expect(el.shadowRoot!.textContent).toContain('Loading');

    resolveTypes(mockEventTypes);
    await waitUntil(() => !el.loading);
    expect(el.loading).toBe(false);
  });
});
