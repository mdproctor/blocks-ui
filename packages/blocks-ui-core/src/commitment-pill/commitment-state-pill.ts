import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import type { CommitmentState } from '../types/commitment.js';
import { commitmentStateCategory } from '../types/commitment.js';
import { stateCategoryStyles } from './styles.js';

const STATE_ICONS: Partial<Record<CommitmentState, string>> = {
  OPEN: '⏳',
  ACKNOWLEDGED: '\u{1F4CB}',
  FULFILLED: '✓',
  FAILED: '✗',
  DECLINED: '\u{1F6AB}',
  DELEGATED: '↳',
  EXPIRED: '⌛',
};

@customElement('commitment-state-pill')
export class CommitmentStatePill extends LitElement {
  @property({ type: String }) state?: CommitmentState;
  @property({ type: String }) size: 'sm' | 'md' = 'sm';
  @property({ type: Boolean }) showIcon = false;

  static override styles = css`
    :host { display: inline-block; }
  `;

  override render() {
    if (!this.state) return nothing;
    const category = commitmentStateCategory(this.state);
    const colors = stateCategoryStyles(category);
    const fontSize = this.size === 'md' ? '12px' : '10px';
    const padding = this.size === 'md' ? '2px 8px' : '1px 6px';

    const styles = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '3px',
      fontSize,
      fontWeight: '500',
      padding,
      borderRadius: '9999px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      lineHeight: '1.4',
      background: colors.background,
      color: colors.color,
    };

    return html`
      <span class="pill" style=${styleMap(styles)} aria-label="Commitment state: ${this.state}">
        ${this.showIcon ? html`<span class="icon">${STATE_ICONS[this.state] ?? '?'}</span>` : nothing}
        ${this.state}
      </span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'commitment-state-pill': CommitmentStatePill;
  }
}
