import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import '@casehubio/blocks-ui-blocks-timeline';
import { sampleMethodologyEvents } from '@casehubio/blocks-ui-agent-detail';
import { methodologyEventsStrategy } from '../../../components/blocks-timeline/src/strategies/methodology-events.js';

@customElement('blocks-example-methodology-timeline')
export class MethodologyTimelinePage extends LitElement {
  static override styles = css`
    :host { display: block; padding: 24px; }
    h2 { font-size: 20px; font-weight: 600; color: var(--pages-neutral-12, #111); margin-bottom: 8px; }
    p { color: var(--pages-neutral-11, #555); font-size: 14px; margin-bottom: 24px; }
    .container { border: 1px solid var(--pages-neutral-5, #e0e0e0); border-radius: 6px;
      background: var(--pages-neutral-1, #fff); height: 500px; overflow: auto; }
  `;

  override render() {
    return html`
      <h2>Methodology Timeline</h2>
      <p>Timeline strategy for agent methodology events. Shows skill invocations, artifact creation,
        knowledge captures, test results, and commits in a chronological vertical feed.
        Filterable by category (skill, artifact, knowledge, test, commit, conductor).</p>
      <div class="container">
        <blocks-timeline
          .data=${sampleMethodologyEvents}
          .strategy=${methodologyEventsStrategy}
        ></blocks-timeline>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap { 'blocks-example-methodology-timeline': MethodologyTimelinePage; }
}
