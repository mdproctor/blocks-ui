import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '../../../components/agent-relationship-editor/src/agent-relationship-editor.js';
import type { AgentRelationship } from '@casehubio/graph-stencil-org';
import type { AgentRosterEntry } from '../../../components/agent-relationship-editor/src/types.js';

const DEMO_ROSTER: AgentRosterEntry[] = [
  { agentId: 'alice', name: 'Alice (Lead)' },
  { agentId: 'bob', name: 'Bob (Support)' },
  { agentId: 'carol', name: 'Carol (Analyst)' },
  { agentId: 'dave', name: 'Dave (Developer)' },
  { agentId: 'eve', name: 'Eve (Security)' },
  { agentId: 'frank', name: 'Frank (Coordinator)' },
];

const DEMO_RELATIONSHIPS: AgentRelationship[] = [
  { sourceAgentId: 'alice', targetAgentId: 'bob', kind: 'SUPERVISES', tenancyId: 'demo' },
  { sourceAgentId: 'alice', targetAgentId: 'carol', kind: 'DELEGATES_TO', tenancyId: 'demo' },
  { sourceAgentId: 'dave', targetAgentId: 'alice', kind: 'REPORTS_TO', tenancyId: 'demo' },
  { sourceAgentId: 'alice', targetAgentId: 'eve', kind: 'ESCALATES_TO', tenancyId: 'demo', scope: { domain: 'security' } },
  { sourceAgentId: 'frank', targetAgentId: 'alice', kind: 'BACKS_UP', tenancyId: 'demo' },
];

@customElement('blocks-example-agent-relationship-editor')
export class AgentRelationshipEditorPage extends LitElement {
  @state() private _eventLog: string[] = [];

  static override styles = css`
    :host { display: block; padding: 24px; }
    h2 { margin-bottom: 8px; font-size: 20px; font-weight: 600; color: var(--pages-neutral-12, #111); }
    p { margin-bottom: 24px; color: var(--pages-neutral-11, #555); font-size: 14px; }
    .demo-section {
      padding: 16px;
      border: 1px solid var(--pages-neutral-5, #e0e0e0);
      border-radius: 6px;
      background: var(--pages-neutral-1, #fff);
    }
    .event-log {
      margin-top: 24px;
      padding: 16px;
      background: var(--pages-neutral-2, #f5f5f5);
      border-radius: 8px;
      max-height: 200px;
      overflow-y: auto;
    }
    .event-log h3 { margin: 0 0 8px; font-size: 14px; }
    .event-log pre { margin: 0; font-size: 12px; font-family: monospace; white-space: pre-wrap; }
  `;

  private _handleEvent(e: CustomEvent) {
    if (e.detail.topic === 'relationship:changed') {
      const cs = e.detail.payload;
      this._eventLog = [
        `[${new Date().toLocaleTimeString()}] relationship:changed — +${cs.additions.length} -${cs.removals.length}`,
        ...this._eventLog.slice(0, 9),
      ];
    }
  }

  override render() {
    return html`
      <h2>Agent Relationship Editor</h2>
      <p>Grouped table with add/remove, arc diagram view, and changeset emission. Editing as Alice.</p>

      <div class="demo-section" @pages-event=${this._handleEvent}>
        <agent-relationship-editor
          agent-id="alice"
          .relationships=${DEMO_RELATIONSHIPS}
          .roster=${DEMO_ROSTER}
        ></agent-relationship-editor>
      </div>

      ${this._eventLog.length > 0 ? html`
        <div class="event-log">
          <h3>Event Log</h3>
          <pre>${this._eventLog.join('\n')}</pre>
        </div>
      ` : ''}
    `;
  }
}
