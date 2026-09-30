import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import '@casehubio/blocks-ui-evolution-workbench';
import '@casehubio/blocks-ui-agent-detail';
import {
  sampleState, sampleStreams, sampleInbox, sampleDenyPatterns,
  sampleWatchPatterns, sampleStages, sampleCategories, sampleGatePolicy,
} from '../../../components/evolution-workbench/src/sample-data.js';

@customElement('blocks-example-evolution-workbench')
export class EvolutionWorkbenchPage extends LitElement {
  static override styles = css`
    :host { display: block; padding: 24px; }
    h2 { font-size: 20px; font-weight: 600; color: var(--pages-neutral-12, #111); margin-bottom: 8px; }
    p { color: var(--pages-neutral-11, #555); font-size: 14px; margin-bottom: 24px; }
    .container { border: 1px solid var(--pages-neutral-5, #e0e0e0); border-radius: 6px;
      background: var(--pages-neutral-1, #fff); height: 700px; }
  `;

  override render() {
    return html`
      <h2>Evolution Workbench</h2>
      <p>Evolution conductor dashboard with KPI summary, tabbed content (Streams, Inbox, Audit,
        Configuration, Health), and agent drill-down. Click a stream row to see the agent detail panel.
        Domain-extensible via the tabs property.</p>
      <div class="container">
        <blocks-evolution-workbench
          .state=${sampleState}
          .streams=${sampleStreams}
          .inbox=${sampleInbox}
          .denyPatterns=${sampleDenyPatterns}
          .watchPatterns=${sampleWatchPatterns}
          .stages=${sampleStages}
          .categories=${sampleCategories}
          .gatePolicy=${sampleGatePolicy}
        ></blocks-evolution-workbench>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap { 'blocks-example-evolution-workbench': EvolutionWorkbenchPage; }
}
