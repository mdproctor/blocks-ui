import { describe, it, expect, afterEach, vi } from 'vitest';
import './channel-message.js';
import './channel-reaction-bar.js';
import type { QhorusMessage } from './types.js';
import { ChannelEventTopics } from './events.js';

function makeMessage(overrides: Partial<QhorusMessage> = {}): QhorusMessage {
  return {
    id: 'msg-1',
    channelId: 'ch-1',
    sender: 'agent-alpha',
    messageType: 'EVENT',
    actorType: 'AGENT',
    content: 'Hello world',
    topic: 'General',
    replyCount: 0,
    artefactRefs: [],
    createdAt: '2026-07-07T12:00:00Z',
    ...overrides,
  };
}

async function renderMessage(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const el = document.createElement('blocks-channel-message') as any;
  el.message = makeMessage(props.message as any);
  if (props.reactions) el.reactions = props.reactions;
  if (props.showSpeechAct !== undefined) el.showSpeechAct = props.showSpeechAct;
  if (props.showActorBadge !== undefined) el.showActorBadge = props.showActorBadge;
  if (props.parentMessage) el.parentMessage = props.parentMessage;
  if (props.channelName) el.channelName = props.channelName;
  if (props.commitmentState) el.commitmentState = props.commitmentState;
  if (props.formatSender) el.formatSender = props.formatSender;
  if (props.renderContent) el.renderContent = props.renderContent;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('blocks-channel-message', () => {
  it('renders sender name', async () => {
    const el = await renderMessage();
    const shadow = el.shadowRoot!;
    expect(shadow.textContent).toContain('agent-alpha');
  });

  it('renders message content as markdown', async () => {
    const el = await renderMessage({ message: { content: '**bold** text' } });
    const shadow = el.shadowRoot!;
    expect(shadow.innerHTML).toContain('<strong>bold</strong>');
  });

  it('renders speech act badge by default', async () => {
    const el = await renderMessage({ message: { messageType: 'COMMAND' } });
    const badge = el.shadowRoot!.querySelector('.speech-act-badge');
    expect(badge).toBeTruthy();
    expect(badge!.textContent!.trim()).toBe('COMMAND');
  });

  it('hides speech act badge when showSpeechAct=false', async () => {
    const el = await renderMessage({ showSpeechAct: false });
    const badge = el.shadowRoot!.querySelector('.speech-act-badge');
    expect(badge).toBeNull();
  });

  it('renders actor icon by default', async () => {
    const el = await renderMessage({ message: { actorType: 'AGENT' } });
    const icon = el.shadowRoot!.querySelector('.actor-icon');
    expect(icon).toBeTruthy();
    expect(icon!.getAttribute('data-actor')).toBe('AGENT');
  });

  it('hides actor icon when showActorBadge=false', async () => {
    const el = await renderMessage({ showActorBadge: false });
    const icon = el.shadowRoot!.querySelector('.actor-icon');
    expect(icon).toBeNull();
  });

  it('applies correct badge color class for each message type', async () => {
    for (const [type, expected] of [
      ['COMMAND', 'obligation'], ['DONE', 'success'], ['FAILURE', 'danger'],
      ['DECLINE', 'warning'], ['HANDOFF', 'transfer'], ['EVENT', 'telemetry'],
      ['QUERY', 'info'], ['RESPONSE', 'info'], ['STATUS', 'info'],
    ] as const) {
      const el = await renderMessage({ message: { messageType: type } });
      const badge = el.shadowRoot!.querySelector('.speech-act-badge');
      expect(badge!.classList.contains(`badge-${expected}`), `${type} should have badge-${expected}`).toBe(true);
      document.body.innerHTML = '';
    }
  });

  it('renders commitment state badge for COMMAND messages', async () => {
    const el = await renderMessage({ message: { messageType: 'COMMAND', commitmentId: 'c-1' } });
    (el as any).commitmentState = 'OPEN';
    await (el as any).updateComplete;
    const badge = el.shadowRoot!.querySelector('commitment-state-pill');
    expect(badge).toBeTruthy();
    expect((badge as any).state).toBe('OPEN');
  });

  it('renders delegation indicator for HANDOFF messages', async () => {
    const el = await renderMessage({ message: { messageType: 'HANDOFF', target: 'agent-beta', sender: 'agent-alpha' } });
    const delegation = el.shadowRoot!.querySelector('.delegation-indicator');
    expect(delegation).toBeTruthy();
    expect(delegation!.textContent).toContain('agent-beta');
  });

  it('renders artefact chips when artefactRefs present', async () => {
    const el = await renderMessage({
      message: { artefactRefs: [{ uri: 'doc:spec.md', type: 'DOCUMENT', label: 'Design Spec' }] },
    });
    const chip = el.shadowRoot!.querySelector('.artefact-chip');
    expect(chip).toBeTruthy();
    expect(chip!.textContent).toContain('Design Spec');
  });

  it('renders nothing when message is not set', async () => {
    const el = document.createElement('blocks-channel-message') as any;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.message-header')).toBeNull();
  });

  it('renders channel-reaction-bar', async () => {
    const el = await renderMessage();
    const bar = el.shadowRoot!.querySelector('blocks-channel-reaction-bar');
    expect(bar).toBeTruthy();
  });

  it('renders relative timestamp', async () => {
    const el = await renderMessage();
    const time = el.shadowRoot!.querySelector('time');
    expect(time).toBeTruthy();
    expect(time!.getAttribute('datetime')).toBe('2026-07-07T12:00:00Z');
  });

  it('expand toggle works', async () => {
    const el = await renderMessage();
    const toggle = el.shadowRoot!.querySelector('.expand-toggle') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    await (el as any).updateComplete;
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(el.shadowRoot!.querySelector('.expanded-section')).toBeTruthy();
  });

  it('reply button emits channel:message-selected event', async () => {
    const el = await renderMessage();
    const toggle = el.shadowRoot!.querySelector('.expand-toggle') as HTMLButtonElement;
    toggle.click();
    await (el as any).updateComplete;

    const handler = vi.fn();
    el.addEventListener('pages-event', handler);
    const replyBtn = el.shadowRoot!.querySelector('.reply-btn') as HTMLButtonElement;
    replyBtn.click();

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]![0]!.detail.topic).toBe(ChannelEventTopics.MESSAGE_SELECTED);
    expect(handler.mock.calls[0]![0]!.detail.payload.message.id).toBe('msg-1');
  });

  it('collapses on Escape key', async () => {
    const el = await renderMessage();
    const toggle = el.shadowRoot!.querySelector('.expand-toggle') as HTMLButtonElement;
    toggle.click();
    await (el as any).updateComplete;
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await (el as any).updateComplete;
    expect(el.shadowRoot!.querySelector('.expanded-section')).toBeNull();
  });

  // --- formatSender extension point ---

  it('uses formatSender callback for sender display', async () => {
    const formatSender = vi.fn((s: string) => s.replace('agent-', 'A:'));
    const el = await renderMessage({ formatSender });
    const sender = el.shadowRoot!.querySelector('.sender');
    expect(sender!.textContent).toBe('A:alpha');
    expect(formatSender).toHaveBeenCalledWith('agent-alpha', 'AGENT');
  });

  it('uses identity function as default formatSender', async () => {
    const el = await renderMessage();
    const sender = el.shadowRoot!.querySelector('.sender');
    expect(sender!.textContent).toBe('agent-alpha');
  });

  it('applies formatSender in expanded correlation context', async () => {
    const parent = makeMessage({ id: 'parent-1', sender: 'claudony-worker-bob', actorType: 'AGENT', content: 'Original question' });
    const formatSender = (s: string) => s.replace('claudony-worker-', '');
    const el = await renderMessage({
      message: { inReplyTo: 'parent-1' },
      parentMessage: parent,
      formatSender,
    });
    const toggle = el.shadowRoot!.querySelector('.expand-toggle') as HTMLButtonElement;
    toggle.click();
    await (el as any).updateComplete;
    const ctx = el.shadowRoot!.querySelector('.correlation-context .parent-sender');
    expect(ctx!.textContent).toBe('bob');
  });

  // --- renderContent extension point ---

  it('uses renderContent callback when it returns a TemplateResult', async () => {
    const { html: litHtml } = await import('lit');
    const renderContent = vi.fn((m: QhorusMessage) =>
      litHtml`<span class="custom">${m.messageType}: ${m.content}</span>`
    );
    const el = await renderMessage({ renderContent });
    const custom = el.shadowRoot!.querySelector('.custom');
    expect(custom).toBeTruthy();
    expect(custom!.textContent).toBe('EVENT: Hello world');
    expect(renderContent).toHaveBeenCalledOnce();
  });

  it('falls back to markdown when renderContent returns undefined', async () => {
    const renderContent = vi.fn(() => undefined);
    const el = await renderMessage({ message: { content: '**bold** text' }, renderContent });
    expect(el.shadowRoot!.innerHTML).toContain('<strong>bold</strong>');
    expect(renderContent).toHaveBeenCalledOnce();
  });

  it('uses default markdown rendering when renderContent is not set', async () => {
    const el = await renderMessage({ message: { content: '**bold** text' } });
    expect(el.shadowRoot!.innerHTML).toContain('<strong>bold</strong>');
  });

  it('passes full message object to renderContent', async () => {
    const { html: litHtml } = await import('lit');
    const renderContent = vi.fn((m: QhorusMessage) =>
      litHtml`<span class="custom">${m.sender}-${m.channelId}</span>`
    );
    const el = await renderMessage({ renderContent });
    const custom = el.shadowRoot!.querySelector('.custom');
    expect(custom!.textContent).toBe('agent-alpha-ch-1');
  });
});
