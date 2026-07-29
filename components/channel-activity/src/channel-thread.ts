import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { QhorusMessage, CommitmentState, Reaction, ActorType } from './types.js';

import './channel-message.js';
import '@casehubio/pages-ui-components';

@customElement('blocks-channel-thread')
export class ChannelThreadElement extends LitElement {
  @property({ type: Object }) rootMessage!: QhorusMessage;
  @property({ type: Array }) replies: QhorusMessage[] = [];
  @property({ type: Array }) reactions: Reaction[] = [];
  @property({ type: Boolean }) collapsed = true;
  @property({ type: String }) commitmentState?: CommitmentState;
  @property({ type: String }) selectedMessageId?: string;
  @property({ attribute: false }) renderContent?: (message: QhorusMessage) => TemplateResult | undefined;
  @property({ attribute: false }) formatSender: (sender: string, actorType: ActorType) => string = (s) => s;

  static override readonly styles = css`
    :host {
      display: block;
      border-left: 2px solid var(--pages-neutral-5, #d4d4d4);
      margin: var(--pages-space-2, 8px) 0;
      border-radius: var(--pages-radius-sm, 4px);
    }
    .thread-header {
      display: flex;
      align-items: center;
      gap: var(--pages-space-2, 8px);
      padding: var(--pages-space-1, 4px) var(--pages-space-2, 8px);
    }
    .thread-toggle {
      font-size: var(--pages-font-size-xs, 11px);
      color: var(--pages-accent-9, #6366f1);
    }

    .reply { padding-left: var(--pages-space-4, 16px); }
    .root-message.selected,
    .reply.selected {
      background: var(--pages-accent-3, #e0e7ff);
      border-radius: var(--pages-radius-sm, 4px);
    }
  `;

  override willUpdate(changed: Map<string, unknown>) {
    if (changed.has('selectedMessageId') && this.selectedMessageId && this.collapsed) {
      if (this.replies.some(r => r.id === this.selectedMessageId)) {
        this.collapsed = false;
      }
    }
  }

  private _toggle() {
    this.collapsed = !this.collapsed;
  }

  private _summary(): string {
    const count = this.replies.length;
    if (count === 0) return 'no replies';
    return `${count} ${count === 1 ? 'reply' : 'replies'}`;
  }

  override render() {
    if (!this.rootMessage) return nothing;

    return html`
      <div class="root-message ${this.selectedMessageId === this.rootMessage.id ? 'selected' : ''}">
        <blocks-channel-message .message=${this.rootMessage}
                        .reactions=${this.reactions.filter(r => r.messageId === this.rootMessage.id)}
                        .commitmentState=${this.commitmentState}
                        .renderContent=${this.renderContent}
                        .formatSender=${this.formatSender}></blocks-channel-message>
      </div>
      ${this.replies.length > 0 ? html`
        <div class="thread-header">
          <pages-button class="thread-toggle" variant="ghost" size="sm"
                  @click=${this._toggle}
                  aria-expanded=${!this.collapsed}>
            ${this.collapsed ? '▶' : '▼'} ${this._summary()}
          </pages-button>
          ${this.commitmentState ? html`
            <commitment-state-pill .state=${this.commitmentState}></commitment-state-pill>
          ` : nothing}
        </div>
        ${!this.collapsed ? html`
          ${this.replies.map(r => html`
            <div class="reply ${this.selectedMessageId === r.id ? 'selected' : ''}">
              <blocks-channel-message .message=${r}
                              .reactions=${this.reactions.filter(rx => rx.messageId === r.id)}
                              .renderContent=${this.renderContent}
                              .formatSender=${this.formatSender}></blocks-channel-message>
            </div>
          `)}
        ` : nothing}
      ` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'blocks-channel-thread': ChannelThreadElement;
  }
}
