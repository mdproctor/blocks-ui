import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '../../../components/agent-profile/src/agent-profile.js';
import type { FullAgentDescriptor } from '@casehubio/blocks-ui-core';

const SAMPLE_DESCRIPTORS: FullAgentDescriptor[] = [
  {
    agentId: 'demo-support-01',
    name: 'Customer Support Agent',
    tenancyId: 'demo',
    slot: 'supporter',
    provider: 'anthropic',
    modelVersion: 'claude-sonnet-5',
    version: '1.2',
    capabilities: [
      { name: 'issue-resolution' },
      { name: 'ticket-management' },
      { name: 'escalation' },
    ],
    disposition: {
      socialOrient: [{ term: 'collaborative', weight: 1.0 }],
      ruleFollowing: [{ term: 'adaptive', weight: 0.8 }, { term: 'strict', weight: 0.2 }],
      riskAppetite: [{ term: 'cautious', weight: 1.0 }],
      autonomy: [{ term: 'semi-autonomous', weight: 1.0 }],
      conflictMode: [{ term: 'diplomatic', weight: 1.0 }],
      delegation: true,
    },
    goals: [
      { name: 'resolve-quickly', priority: 'PRIMARY' },
      { name: 'customer-satisfaction', priority: 'SECONDARY' },
    ],
    constraints: [
      { name: 'data-privacy', severity: 'HARD' },
      { name: 'response-time', severity: 'SOFT' },
    ],
    briefing: 'You are a customer support specialist focused on resolving issues efficiently and empathetically. Always prioritise the customer experience while maintaining data privacy.',
  },
  {
    agentId: 'demo-dev-01',
    name: 'Software Developer',
    tenancyId: 'demo',
    slot: 'developer',
    provider: 'anthropic',
    modelVersion: 'claude-opus-5',
    capabilities: [
      { name: 'code-generation' },
      { name: 'code-review' },
      { name: 'debugging' },
      { name: 'architecture' },
    ],
    disposition: {
      socialOrient: [{ term: 'independent', weight: 0.7 }, { term: 'collaborative', weight: 0.3 }],
      ruleFollowing: [{ term: 'adaptive', weight: 1.0 }],
      riskAppetite: [{ term: 'moderate', weight: 1.0 }],
      autonomy: [{ term: 'fully-autonomous', weight: 1.0 }],
      conflictMode: [{ term: 'assertive', weight: 1.0 }],
    },
    goals: [{ name: 'code-quality', priority: 'PRIMARY' }],
    briefing: 'You are a senior software developer. Write clean, tested, production-ready code.',
  },
];

@customElement('blocks-example-agent-profile')
export class AgentProfilePage extends LitElement {
  @state() private _selectedIndex = 0;
  @state() private _eventLog: string[] = [];

  static override styles = css`
    :host { display: block; padding: 24px; }
    h2 { margin-bottom: 8px; font-size: 20px; font-weight: 600; color: var(--pages-neutral-12, #111); }
    p { margin-bottom: 24px; color: var(--pages-neutral-11, #555); font-size: 14px; }
    .selector {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }
    .selector button {
      padding: 6px 16px;
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      border-radius: 16px;
      background: var(--pages-neutral-1, #fff);
      cursor: pointer;
      font-size: 13px;
      font-family: inherit;
    }
    .selector button.active {
      background: var(--pages-accent-3, #dbeafe);
      border-color: var(--pages-accent-7, #0066cc);
    }
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
      max-height: 150px;
      overflow-y: auto;
    }
    .event-log h3 { margin: 0 0 8px; font-size: 14px; }
    .event-log pre { margin: 0; font-size: 12px; font-family: monospace; white-space: pre-wrap; }
  `;

  private _handleEvent(e: CustomEvent) {
    if (e.detail.topic === 'agent:updated') {
      this._eventLog = [
        `[${new Date().toLocaleTimeString()}] agent:updated — ${e.detail.payload.name}`,
        ...this._eventLog.slice(0, 9),
      ];
    }
  }

  override render() {
    return html`
      <h2>Agent Profile</h2>
      <p>Character sheet display with disposition radar chart and inline editing.</p>

      <div class="selector">
        ${SAMPLE_DESCRIPTORS.map((d, i) => html`
          <button class="${i === this._selectedIndex ? 'active' : ''}"
            @click=${() => { this._selectedIndex = i; }}>${d.name}</button>
        `)}
      </div>

      <div class="demo-section" @pages-event=${this._handleEvent}>
        <agent-profile .descriptor=${SAMPLE_DESCRIPTORS[this._selectedIndex]}></agent-profile>
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
