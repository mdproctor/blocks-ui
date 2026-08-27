import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('blocks-json-editor')
export class BlocksJsonEditorElement extends LitElement {
  @property({ type: Object }) value: unknown = {};

  static override styles = css`
    :host { display: block; }
    pre { font-family: monospace; font-size: 12px; white-space: pre-wrap; word-break: break-all; margin: 0; }
  `;

  override render() {
    return html`<pre role="region" aria-label="JSON viewer">${JSON.stringify(this.value, null, 2)}</pre>`;
  }
}
