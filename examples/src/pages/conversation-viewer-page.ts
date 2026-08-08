import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { MOCK_CONVERSATION_STATE } from '../mock/conversation-state.js';
import '../../../components/conversation-viewer/src/blocks-conversation-workbench.js';

@customElement('blocks-example-conversation-viewer')
export class ConversationViewerPage extends LitElement {
  @state() private _eventLog: string[] = [];

  static override styles = css`
    :host { display: flex; flex-direction: column; padding: 24px; height: 100%; box-sizing: border-box; }
    h2 { margin: 0 0 8px; font-size: 20px; font-weight: 600; color: var(--pages-neutral-12, #111); flex-shrink: 0; }
    p { margin: 0 0 16px; font-size: 13px; color: var(--pages-neutral-9, #6b7280); flex-shrink: 0; }
    .workbench-container { flex: 1; min-height: 0; border: 1px solid var(--pages-neutral-5, #e0e0e0); border-radius: 6px; overflow: hidden; }
    .event-log { flex-shrink: 0; margin-top: 12px; padding: 8px 12px; background: var(--pages-neutral-2, #f5f5f5); border-radius: 4px; max-height: 80px; overflow-y: auto; font-size: 12px; font-family: monospace; color: var(--pages-neutral-11, #555); }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('pages-event', this._logEvent);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('pages-event', this._logEvent);
  }

  private _logEvent = (e: Event): void => {
    const detail = (e as CustomEvent).detail;
    if (!detail?.topic) return;
    const topic = detail.topic as string;
    if (topic.startsWith('conversation-point') || topic.startsWith('common-ground-fact')) {
      this._eventLog = [
        `[${new Date().toLocaleTimeString()}] ${topic}: ${JSON.stringify(detail.payload ?? {})}`.slice(0, 120),
        ...this._eventLog.slice(0, 9),
      ];
    }
  };

  override render() {
    return html`
      <h2>Conversation Protocol Viewer</h2>
      <p>Structured deliberation with convergence, epistemic common ground, and point tracking. Select a point to view its thread, findings, and obligations.</p>

      <div class="workbench-container">
        <blocks-conversation-workbench
          .conversationState=${MOCK_CONVERSATION_STATE}
          selection-topic="conversation-point"
        ></blocks-conversation-workbench>
      </div>

      ${this._eventLog.length > 0 ? html`
        <div class="event-log">
          ${this._eventLog.map(e => html`<div>${e}</div>`)}
        </div>
      ` : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'blocks-example-conversation-viewer': ConversationViewerPage;
  }
}
