import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './notification-preferences.js';
import type { NotificationPreferencesEl } from './notification-preferences.js';

describe('notification-preferences', () => {
  let el: NotificationPreferencesEl;

  beforeEach(async () => {
    el = document.createElement('notification-preferences') as NotificationPreferencesEl;
    el.endpoint = 'http://localhost/api';
    el.identity = { userId: 'user-1', tenancyId: 'tenant-1' };
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => el.remove());

  it('renders all three child components', () => {
    const channelPrefs = el.shadowRoot!.querySelector('channel-preferences');
    const muteList = el.shadowRoot!.querySelector('mute-list');
    const snoozeControl = el.shadowRoot!.querySelector('snooze-control');
    expect(channelPrefs).toBeTruthy();
    expect(muteList).toBeTruthy();
    expect(snoozeControl).toBeTruthy();
  });

  it('passes endpoint to children', () => {
    const channelPrefs = el.shadowRoot!.querySelector('channel-preferences') as any;
    const muteList = el.shadowRoot!.querySelector('mute-list') as any;
    const snoozeControl = el.shadowRoot!.querySelector('snooze-control') as any;
    expect(channelPrefs.endpoint).toBe('http://localhost/api');
    expect(muteList.endpoint).toBe('http://localhost/api');
    expect(snoozeControl.endpoint).toBe('http://localhost/api');
  });

  it('passes identity to children', () => {
    const channelPrefs = el.shadowRoot!.querySelector('channel-preferences') as any;
    const muteList = el.shadowRoot!.querySelector('mute-list') as any;
    const snoozeControl = el.shadowRoot!.querySelector('snooze-control') as any;
    expect(channelPrefs.identity).toEqual({ userId: 'user-1', tenancyId: 'tenant-1' });
    expect(muteList.identity).toEqual({ userId: 'user-1', tenancyId: 'tenant-1' });
    expect(snoozeControl.identity).toEqual({ userId: 'user-1', tenancyId: 'tenant-1' });
  });

  it('renders three section headings', () => {
    const headings = el.shadowRoot!.querySelectorAll('h3');
    expect(headings.length).toBe(3);
    expect(headings[0]!.textContent).toContain('Delivery Channels');
    expect(headings[1]!.textContent).toContain('Muted');
    expect(headings[2]!.textContent).toContain('Snooze');
  });
});
