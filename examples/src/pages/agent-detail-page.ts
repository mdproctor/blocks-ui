import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '@casehubio/blocks-ui-agent-detail';
import type { AgentControlConfig } from '@casehubio/blocks-ui-agent-detail';
import {
  sampleAgentImprovementView, sampleMethodologyEvents,
} from '@casehubio/blocks-ui-agent-detail';

@customElement('blocks-example-agent-detail')
export class AgentDetailPage extends LitElement {
  @state() private _showDestructive = false;

  private get _controlConfig(): AgentControlConfig {
    if (this._showDestructive) {
      return { allowedActions: ['PAUSE', 'RESUME', 'INTERVENE', 'FORCE_TRANSITION', 'REASSIGN', 'TERMINATE'] };
    }
    return {};
  }

  static override styles = css`
    :host { display: block; padding: 24px; }
    h2 { font-size: 20px; font-weight: 600; color: var(--pages-neutral-12, #111); margin-bottom: 8px; }
    p { color: var(--pages-neutral-11, #555); font-size: 14px; margin-bottom: 24px; }
    .controls { display: flex; gap: 16px; align-items: center; margin-bottom: 16px; }
    label { font-size: 13px; font-weight: 500; color: var(--pages-neutral-11, #555); }
    .container { border: 1px solid var(--pages-neutral-5, #e0e0e0); border-radius: 6px;
      background: var(--pages-neutral-1, #fff); height: 600px; }
  `;

  override render() {
    return html`
      <h2>Agent Detail</h2>
      <p>Methodology drill-down for an executing agent within the evolution conductor.
        Shows methodology indicator (active skill + artifact), Session tab (composed session-detail),
        Methodology tab (event timeline), and a gate-aware control bar.
        Safe actions (Pause/Resume) are shown by default; destructive actions require opt-in.</p>
      <div class="controls">
        <label>
          <input type="checkbox" ?checked=${this._showDestructive}
                 @change=${(e: Event) => { this._showDestructive = (e.target as HTMLInputElement).checked; }} />
          Show destructive actions
        </label>
      </div>
      <div class="container">
        <blocks-agent-detail
          .data=${sampleAgentImprovementView}
          .events=${sampleMethodologyEvents}
          .controlConfig=${this._controlConfig}
        ></blocks-agent-detail>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap { 'blocks-example-agent-detail': AgentDetailPage; }
}
