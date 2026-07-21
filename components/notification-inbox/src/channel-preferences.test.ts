import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NotificationApi } from './api.js';
import './channel-preferences.js';
import type { ChannelPreferences } from './channel-preferences.js';
import type { DeliveryChannelDescriptor, NotificationPreferences, NotificationPreferenceUpdate } from './types.js';

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

const mockChannels: DeliveryChannelDescriptor[] = [
  {
    channelId: 'email',
    displayName: 'Email',
    external: false,
    defaultEnabled: true,
    defaultMinSeverity: 'INFO',
    defaultDigestSchedule: { type: 'daily_at', time: '09:00', timezone: 'UTC' },
  },
  {
    channelId: 'slack',
    displayName: 'Slack',
    external: true,
    defaultEnabled: false,
    defaultMinSeverity: 'WARNING',
    defaultDigestSchedule: null,
  },
];

const mockPreferences: NotificationPreferences = {
  userId: 'user-1',
  tenancyId: 'tenant-1',
  channelDefaults: {
    email: {
      enabled: true,
      minSeverity: 'INFO',
      digestSchedule: { type: 'daily_at', time: '09:00', timezone: 'UTC' },
    },
  },
  quietHours: null,
  updatedAt: '2026-07-01T10:00:00Z',
};

function createMockApi(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    getChannels: async () => mockChannels,
    getPreferences: async () => mockPreferences,
    updatePreferences: async (update: NotificationPreferenceUpdate) => ({
      ...mockPreferences,
      ...update,
      updatedAt: '2026-07-21T10:00:00Z',
    }),
    ...overrides,
  } as unknown as NotificationApi;
}

describe('channel-preferences', () => {
  let el: ChannelPreferences;

  beforeEach(async () => {
    el = document.createElement('channel-preferences') as ChannelPreferences;
    el.endpoint = 'http://localhost/api';
    el.api = createMockApi();
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => el.remove());

  it('fetches channels and preferences on connect', async () => {
    await waitUntil(() => !el.loading, 'loaded');
    await el.updateComplete;
    const form = el.shadowRoot!.querySelector('pages-schema-form');
    expect(form).toBeTruthy();
  });

  it('builds per-channel schema from descriptors', async () => {
    await waitUntil(() => !el.loading);
    await el.updateComplete;
    const form = el.shadowRoot!.querySelector('pages-schema-form') as any;
    expect(form.schema.properties.email).toBeTruthy();
    expect(form.schema.properties.slack).toBeTruthy();
    expect(form.schema.properties.email.properties.enabled.type).toBe('boolean');
  });

  it('defaults deliveryMode from descriptor digestSchedule', async () => {
    await waitUntil(() => !el.loading);
    await el.updateComplete;
    const form = el.shadowRoot!.querySelector('pages-schema-form') as any;
    expect(form.data.email.deliveryMode).toBe('DIGEST');
    expect(form.data.slack.deliveryMode).toBe('IMMEDIATE');
  });

  it('calls updatePreferences on save', async () => {
    let updateCalled = false;
    el.api = createMockApi({
      updatePreferences: async (update: NotificationPreferenceUpdate) => {
        updateCalled = true;
        return { ...mockPreferences, ...update };
      },
    });
    await waitUntil(() => !el.loading);
    await el.updateComplete;
    await el.save();
    expect(updateCalled).toBe(true);
  });

  it('emits preference.updated event on save', async () => {
    await waitUntil(() => !el.loading);
    let eventFired = false;
    el.addEventListener('pages-event', ((e: CustomEvent) => {
      if (e.detail.topic === 'preference.updated') eventFired = true;
    }) as EventListener);
    await el.save();
    expect(eventFired).toBe(true);
  });

  it('renders quiet hours with time inputs', async () => {
    await waitUntil(() => !el.loading);
    await el.updateComplete;
    const form = el.shadowRoot!.querySelector('pages-schema-form') as any;
    expect(form.schema.properties.quietHours).toBeTruthy();
    expect(form.schema.properties.quietHours.properties.start.format).toBe('time');
  });

  it('shows error on fetch failure', async () => {
    el.remove();
    el = document.createElement('channel-preferences') as ChannelPreferences;
    el.endpoint = 'http://localhost/api';
    el.api = createMockApi({
      getChannels: async () => { throw new Error('Network error'); },
    });
    document.body.appendChild(el);
    await el.updateComplete;
    await waitUntil(() => el.error != null, 'error set');
    expect(el.shadowRoot!.textContent).toContain('Network error');
  });
});
