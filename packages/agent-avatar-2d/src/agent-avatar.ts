import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type { AgentDisposition } from '@casehubio/blocks-ui-core';
import { generateAvatar } from './generator.js';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZE_PX: Record<AvatarSize, number> = { xs: 24, sm: 40, md: 64, lg: 128 };

@customElement('agent-avatar')
export class AgentAvatar extends LitElement {
  static override styles = css`
    :host { display: inline-block; }
    .avatar-container { border-radius: 50%; overflow: hidden; }
    .avatar-container svg { display: block; width: 100%; height: 100%; }
  `;

  @property({ type: String }) size: AvatarSize = 'md';
  @property({ type: Object }) disposition?: AgentDisposition;

  override connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'img');
    if (!this.hasAttribute('aria-label')) {
      this.setAttribute('aria-label', 'Agent avatar');
    }
  }

  override render() {
    const px = SIZE_PX[this.size];
    const svg = generateAvatar(this.disposition ?? {});
    return html`
      <div class="avatar-container" style="width:${px}px;height:${px}px;">
        ${unsafeHTML(svg)}
      </div>
    `;
  }
}
