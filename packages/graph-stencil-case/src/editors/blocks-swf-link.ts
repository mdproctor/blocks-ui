import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('blocks-swf-link')
export class BlocksSwfLinkElement extends LitElement {
  static override styles = css`
    :host { display: block; }
    span { font-size: 13px; color: var(--pages-text-secondary, #666); }
  `;

  override render() {
    return html`<span role="link" aria-label="Edit via SWF drill-down">Edit via SWF drill-down ⤢</span>`;
  }
}
