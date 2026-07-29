import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { TransitionRecord } from './types.js';
import '@casehubio/blocks-ui-core';

@customElement('commitment-transition-badge')
export class CommitmentTransitionBadge extends LitElement {
  @property({ type: Object }) transition?: TransitionRecord;
  @property({ type: Boolean }) compact = false;

  static override styles = css`
    :host { display: inline-flex; align-items: center; gap: 6px; }
    .arrow { color: var(--pages-neutral-8, #888); font-size: 12px; }
    .meta { font-size: 11px; color: var(--pages-neutral-8, #888); }
    .actor { font-weight: 500; color: var(--pages-neutral-11, #333); }
  `;

  private _formatRelativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  override render() {
    if (!this.transition) return nothing;
    const { from, to, actor, timestamp } = this.transition;

    return html`
      <span aria-label="Transition from ${from} to ${to}">
        <commitment-state-pill .state=${from} size="sm"></commitment-state-pill>
        <span class="arrow">→</span>
        <commitment-state-pill .state=${to} size="sm"></commitment-state-pill>
      </span>
      ${!this.compact ? html`
        <span class="meta">
          ${actor ? html`<span class="actor">${actor}</span> · ` : nothing}
          ${this._formatRelativeTime(timestamp)}
        </span>
      ` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'commitment-transition-badge': CommitmentTransitionBadge;
  }
}
