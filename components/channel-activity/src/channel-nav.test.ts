import { describe, it, expect, afterEach, vi } from 'vitest';
import './channel-nav.js';
import type { QhorusChannel } from './types.js';
import { ChannelEventTopics } from './events.js';

describe('blocks-channel-nav', () => {
  let el: HTMLElement;

  afterEach(() => {
    el?.remove();
    vi.restoreAllMocks();
  });

  it('renders list of channels with names', async () => {
    el = document.createElement('blocks-channel-nav');
    const channels: QhorusChannel[] = [
      { id: 'ch1', name: 'General', semantic: 'APPEND', paused: false },
      { id: 'ch2', name: 'Urgent', semantic: 'COLLECT', paused: false },
    ];
    (el as any).channels = channels;
    document.body.appendChild(el);
    await (el as any).updateComplete;

    const items = el.shadowRoot!.querySelectorAll('.channel-item');
    expect(items.length).toBe(2);
    expect(items[0]!.textContent).toContain('General');
    expect(items[1]!.textContent).toContain('Urgent');
  });

  it('highlights selected channel', async () => {
    el = document.createElement('blocks-channel-nav');
    (el as any).channels = [
      { id: 'ch1', name: 'General', semantic: 'APPEND', paused: false },
      { id: 'ch2', name: 'Urgent', semantic: 'COLLECT', paused: false },
    ];
    (el as any).selectedChannelId = 'ch1';
    document.body.appendChild(el);
    await (el as any).updateComplete;

    const items = el.shadowRoot!.querySelectorAll('.channel-item');
    expect(items[0]!.classList.contains('selected')).toBe(true);
    expect(items[1]!.classList.contains('selected')).toBe(false);
    expect(items[0]!.getAttribute('aria-selected')).toBe('true');
  });

  it('emits channel:selected on channel click', async () => {
    el = document.createElement('blocks-channel-nav');
    (el as any).channels = [{ id: 'ch1', name: 'General', semantic: 'APPEND', paused: false }];
    document.body.appendChild(el);
    await (el as any).updateComplete;

    const listener = vi.fn();
    el.addEventListener('pages-event', listener);
    (el.shadowRoot!.querySelector('.channel-item') as HTMLElement).click();

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]![0]!.detail.topic).toBe(ChannelEventTopics.SELECT_CHANNEL);
    expect(listener.mock.calls[0]![0]!.detail.payload).toEqual({ channelId: 'ch1' });
  });

  it('opens delete dialog on delete click', async () => {
    el = document.createElement('blocks-channel-nav');
    (el as any).channels = [{ id: 'ch1', name: 'General', semantic: 'APPEND', paused: false }];
    document.body.appendChild(el);
    await (el as any).updateComplete;

    (el.shadowRoot!.querySelector('.delete-btn') as HTMLElement).click();
    await (el as any).updateComplete;

    const dialog = el.shadowRoot!.querySelector('.delete-dialog') as any;
    expect(dialog).toBeTruthy();
    expect(dialog.open).toBe(true);
    expect(dialog.heading).toBe('Delete Channel');
    expect(dialog.message).toContain('General');
  });

  it('emits channel:delete on dialog confirm', async () => {
    el = document.createElement('blocks-channel-nav');
    (el as any).channels = [{ id: 'ch1', name: 'General', semantic: 'APPEND', paused: false }];
    document.body.appendChild(el);
    await (el as any).updateComplete;

    (el.shadowRoot!.querySelector('.delete-btn') as HTMLElement).click();
    await (el as any).updateComplete;

    const listener = vi.fn();
    el.addEventListener('pages-event', listener);

    const dialog = el.shadowRoot!.querySelector('.delete-dialog') as HTMLElement;
    dialog.dispatchEvent(new CustomEvent('confirm', { bubbles: true, composed: true }));

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]![0]!.detail.topic).toBe(ChannelEventTopics.DELETE_CHANNEL);
    expect(listener.mock.calls[0]![0]!.detail.payload).toEqual({ channelId: 'ch1' });
  });

  it('closes delete dialog on cancel without emitting', async () => {
    el = document.createElement('blocks-channel-nav');
    (el as any).channels = [{ id: 'ch1', name: 'General', semantic: 'APPEND', paused: false }];
    document.body.appendChild(el);
    await (el as any).updateComplete;

    (el.shadowRoot!.querySelector('.delete-btn') as HTMLElement).click();
    await (el as any).updateComplete;

    const listener = vi.fn();
    el.addEventListener('pages-event', listener);

    const dialog = el.shadowRoot!.querySelector('.delete-dialog') as HTMLElement;
    dialog.dispatchEvent(new CustomEvent('cancel', { bubbles: true, composed: true }));
    await (el as any).updateComplete;

    expect(listener).not.toHaveBeenCalled();
    expect((el.shadowRoot!.querySelector('.delete-dialog') as any).open).toBe(false);
  });

  it('opens create dialog on create click', async () => {
    el = document.createElement('blocks-channel-nav');
    document.body.appendChild(el);
    await (el as any).updateComplete;

    (el.shadowRoot!.querySelector('.create-channel-btn') as HTMLElement).click();
    await (el as any).updateComplete;

    const dialog = el.shadowRoot!.querySelector('.create-dialog') as any;
    expect(dialog).toBeTruthy();
    expect(dialog.open).toBe(true);
    expect(dialog.heading).toBe('Create Channel');
    expect(dialog.showReason).toBe(true);
  });

  it('emits channel:create with name from dialog confirm', async () => {
    el = document.createElement('blocks-channel-nav');
    document.body.appendChild(el);
    await (el as any).updateComplete;

    (el.shadowRoot!.querySelector('.create-channel-btn') as HTMLElement).click();
    await (el as any).updateComplete;

    const listener = vi.fn();
    el.addEventListener('pages-event', listener);

    const dialog = el.shadowRoot!.querySelector('.create-dialog') as HTMLElement;
    dialog.dispatchEvent(new CustomEvent('confirm', { bubbles: true, composed: true, detail: { reason: 'New Channel' } }));

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]![0]!.detail.topic).toBe(ChannelEventTopics.CREATE_CHANNEL);
    expect(listener.mock.calls[0]![0]!.detail.payload).toEqual({ name: 'New Channel' });
  });

  it('does not emit create when dialog cancelled', async () => {
    el = document.createElement('blocks-channel-nav');
    document.body.appendChild(el);
    await (el as any).updateComplete;

    (el.shadowRoot!.querySelector('.create-channel-btn') as HTMLElement).click();
    await (el as any).updateComplete;

    const listener = vi.fn();
    el.addEventListener('pages-event', listener);

    const dialog = el.shadowRoot!.querySelector('.create-dialog') as HTMLElement;
    dialog.dispatchEvent(new CustomEvent('cancel', { bubbles: true, composed: true }));
    await (el as any).updateComplete;

    expect(listener).not.toHaveBeenCalled();
    expect((el.shadowRoot!.querySelector('.create-dialog') as any).open).toBe(false);
  });

  it('navigates channels with arrow keys and Enter', async () => {
    el = document.createElement('blocks-channel-nav');
    (el as any).channels = [
      { id: 'ch1', name: 'General', semantic: 'APPEND', paused: false },
      { id: 'ch2', name: 'Urgent', semantic: 'COLLECT', paused: false },
      { id: 'ch3', name: 'Random', semantic: 'BARRIER', paused: false },
    ];
    document.body.appendChild(el);
    await (el as any).updateComplete;

    const list = el.shadowRoot!.querySelector('.channel-list') as HTMLElement;
    let items = el.shadowRoot!.querySelectorAll('.channel-item');
    expect(items[0]!.classList.contains('focused')).toBe(true);

    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await (el as any).updateComplete;
    items = el.shadowRoot!.querySelectorAll('.channel-item');
    expect(items[1]!.classList.contains('focused')).toBe(true);

    const listener = vi.fn();
    el.addEventListener('pages-event', listener);
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]![0]!.detail.payload).toEqual({ channelId: 'ch2' });
  });

  it('handles empty channel list without crashing', async () => {
    el = document.createElement('blocks-channel-nav');
    (el as any).channels = [];
    document.body.appendChild(el);
    await (el as any).updateComplete;

    expect(el.shadowRoot!.querySelectorAll('.channel-item').length).toBe(0);
    const list = el.shadowRoot!.querySelector('.channel-list') as HTMLElement;
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await (el as any).updateComplete;
    expect((el as any)._focusedIndex).toBe(0);
  });

  // --- showCreate / showDelete toggles (#64) ---

  it('hides create button when showCreate=false', async () => {
    el = document.createElement('blocks-channel-nav');
    (el as any).showCreate = false;
    document.body.appendChild(el);
    await (el as any).updateComplete;

    expect(el.shadowRoot!.querySelector('.create-channel-btn')).toBeNull();
  });

  it('shows create button by default', async () => {
    el = document.createElement('blocks-channel-nav');
    document.body.appendChild(el);
    await (el as any).updateComplete;

    expect(el.shadowRoot!.querySelector('.create-channel-btn')).toBeTruthy();
  });

  it('hides delete buttons when showDelete=false', async () => {
    el = document.createElement('blocks-channel-nav');
    (el as any).channels = [{ id: 'ch1', name: 'General', semantic: 'APPEND', paused: false }];
    (el as any).showDelete = false;
    document.body.appendChild(el);
    await (el as any).updateComplete;

    expect(el.shadowRoot!.querySelector('.delete-btn')).toBeNull();
  });

  it('shows delete buttons by default', async () => {
    el = document.createElement('blocks-channel-nav');
    (el as any).channels = [{ id: 'ch1', name: 'General', semantic: 'APPEND', paused: false }];
    document.body.appendChild(el);
    await (el as any).updateComplete;

    expect(el.shadowRoot!.querySelector('.delete-btn')).toBeTruthy();
  });

  // --- messageCounts (#64) ---

  it('displays message count badge in sidebar mode', async () => {
    el = document.createElement('blocks-channel-nav');
    (el as any).channels = [
      { id: 'ch1', name: 'General', semantic: 'APPEND', paused: false },
      { id: 'ch2', name: 'Urgent', semantic: 'COLLECT', paused: false },
    ];
    (el as any).messageCounts = { ch1: 42, ch2: 0 };
    document.body.appendChild(el);
    await (el as any).updateComplete;

    const badges = el.shadowRoot!.querySelectorAll('pages-badge');
    expect(badges.length).toBe(1);
    expect(badges[0]!.getAttribute('label')).toBe('42');
  });

  it('does not display count badge when count is zero or absent', async () => {
    el = document.createElement('blocks-channel-nav');
    (el as any).channels = [
      { id: 'ch1', name: 'General', semantic: 'APPEND', paused: false },
    ];
    (el as any).messageCounts = {};
    document.body.appendChild(el);
    await (el as any).updateComplete;

    expect(el.shadowRoot!.querySelector('pages-badge')).toBeNull();
  });

  // --- layout: dropdown (#64) ---

  it('renders as custom dropdown in dropdown mode', async () => {
    el = document.createElement('blocks-channel-nav');
    (el as any).channels = [
      { id: 'ch1', name: 'General', semantic: 'APPEND', paused: false },
      { id: 'ch2', name: 'Urgent', semantic: 'COLLECT', paused: false },
    ];
    (el as any).layout = 'dropdown';
    document.body.appendChild(el);
    await (el as any).updateComplete;

    const trigger = el.shadowRoot!.querySelector('.dropdown-trigger') as HTMLElement;
    expect(trigger).toBeTruthy();
    expect(trigger.textContent).toContain('General');
    expect(el.shadowRoot!.querySelector('.channel-list')).toBeNull();

    trigger.click();
    await (el as any).updateComplete;

    const options = el.shadowRoot!.querySelectorAll('.dropdown-option');
    expect(options.length).toBe(2);
    expect(options[0]!.textContent).toContain('General');
    expect(options[1]!.textContent).toContain('Urgent');
  });

  it('emits channel:selected on dropdown option click', async () => {
    el = document.createElement('blocks-channel-nav');
    (el as any).channels = [
      { id: 'ch1', name: 'General', semantic: 'APPEND', paused: false },
      { id: 'ch2', name: 'Urgent', semantic: 'COLLECT', paused: false },
    ];
    (el as any).layout = 'dropdown';
    document.body.appendChild(el);
    await (el as any).updateComplete;

    (el.shadowRoot!.querySelector('.dropdown-trigger') as HTMLElement).click();
    await (el as any).updateComplete;

    const listener = vi.fn();
    el.addEventListener('pages-event', listener);

    const options = el.shadowRoot!.querySelectorAll('.dropdown-option');
    (options[1] as HTMLElement).click();

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]![0]!.detail.topic).toBe(ChannelEventTopics.SELECT_CHANNEL);
    expect(listener.mock.calls[0]![0]!.detail.payload).toEqual({ channelId: 'ch2' });
  });

  it('reflects selectedChannelId in dropdown trigger', async () => {
    el = document.createElement('blocks-channel-nav');
    (el as any).channels = [
      { id: 'ch1', name: 'General', semantic: 'APPEND', paused: false },
      { id: 'ch2', name: 'Urgent', semantic: 'COLLECT', paused: false },
    ];
    (el as any).layout = 'dropdown';
    (el as any).selectedChannelId = 'ch2';
    document.body.appendChild(el);
    await (el as any).updateComplete;

    const trigger = el.shadowRoot!.querySelector('.dropdown-trigger') as HTMLElement;
    expect(trigger.textContent).toContain('Urgent');
  });

  it('shows message counts in dropdown options', async () => {
    el = document.createElement('blocks-channel-nav');
    (el as any).channels = [
      { id: 'ch1', name: 'General', semantic: 'APPEND', paused: false },
    ];
    (el as any).layout = 'dropdown';
    (el as any).messageCounts = { ch1: 7 };
    document.body.appendChild(el);
    await (el as any).updateComplete;

    const trigger = el.shadowRoot!.querySelector('.dropdown-trigger') as HTMLElement;
    expect(trigger.textContent).toContain('(7)');

    trigger.click();
    await (el as any).updateComplete;
    const option = el.shadowRoot!.querySelector('.dropdown-option .dropdown-count');
    expect(option).toBeTruthy();
    expect(option!.textContent!.trim()).toBe('7');
  });

  it('closes dropdown on Escape', async () => {
    el = document.createElement('blocks-channel-nav');
    (el as any).channels = [{ id: 'ch1', name: 'General', semantic: 'APPEND', paused: false }];
    (el as any).layout = 'dropdown';
    document.body.appendChild(el);
    await (el as any).updateComplete;

    const trigger = el.shadowRoot!.querySelector('.dropdown-trigger') as HTMLElement;
    trigger.click();
    await (el as any).updateComplete;
    expect(el.shadowRoot!.querySelector('.dropdown-panel')).toBeTruthy();

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await (el as any).updateComplete;
    expect(el.shadowRoot!.querySelector('.dropdown-panel')).toBeNull();
  });

  it('hides create and delete in dropdown mode regardless of toggle values', async () => {
    el = document.createElement('blocks-channel-nav');
    (el as any).channels = [{ id: 'ch1', name: 'General', semantic: 'APPEND', paused: false }];
    (el as any).layout = 'dropdown';
    (el as any).showCreate = true;
    (el as any).showDelete = true;
    document.body.appendChild(el);
    await (el as any).updateComplete;

    expect(el.shadowRoot!.querySelector('.create-channel-btn')).toBeNull();
    expect(el.shadowRoot!.querySelector('.delete-btn')).toBeNull();
  });

  it('renders sidebar by default', async () => {
    el = document.createElement('blocks-channel-nav');
    (el as any).channels = [{ id: 'ch1', name: 'General', semantic: 'APPEND', paused: false }];
    document.body.appendChild(el);
    await (el as any).updateComplete;

    expect(el.shadowRoot!.querySelector('.channel-list')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('.dropdown-trigger')).toBeNull();
  });
});
