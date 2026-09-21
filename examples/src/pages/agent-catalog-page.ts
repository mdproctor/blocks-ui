import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '../../../components/agent-catalog/src/agent-catalog.js';
import '../../../components/agent-catalog/src/agent-wizard.js';
import type { FullAgentDescriptor } from '@casehubio/blocks-ui-core';

@customElement('blocks-example-agent-catalog')
export class AgentCatalogPage extends LitElement {
  @state() private _view: 'catalog' | 'wizard' = 'catalog';
  @state() private _selectedAgent: FullAgentDescriptor | null = null;
  @state() private _eventLog: string[] = [];

  static override styles = css`
    :host { display: block; padding: 24px; }
    h2 { margin-bottom: 8px; font-size: 20px; font-weight: 600; color: var(--pages-neutral-12, #111); }
    p { margin-bottom: 24px; color: var(--pages-neutral-11, #555); font-size: 14px; }
    h3 { margin: 24px 0 12px; font-size: 16px; font-weight: 600; }
    .view-toggle {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }
    .toggle-btn {
      padding: 6px 16px;
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      border-radius: 16px;
      background: var(--pages-neutral-1, #fff);
      color: var(--pages-neutral-12, #111);
      cursor: pointer;
      font-size: 13px;
      font-family: inherit;
    }
    .toggle-btn.active {
      background: var(--pages-accent-3, #dbeafe);
      border-color: var(--pages-accent-7, #0066cc);
    }
    .demo-section {
      padding: 16px;
      border: 1px solid var(--pages-neutral-5, #e0e0e0);
      border-radius: 6px;
      background: var(--pages-neutral-1, #fff);
      margin-bottom: 24px;
    }
    .selected-panel {
      margin-top: 16px;
      padding: 12px;
      background: var(--pages-accent-2, #eff6ff);
      border-radius: 6px;
    }
    .selected-panel pre { font-size: 12px; font-family: monospace; white-space: pre-wrap; margin: 0; }
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
    const topic = e.detail.topic;
    if (topic === 'agent:selected') {
      this._selectedAgent = e.detail.payload;
      this._eventLog = [
        `[${new Date().toLocaleTimeString()}] agent:selected — ${e.detail.payload.name}`,
        ...this._eventLog.slice(0, 9),
      ];
    } else if (topic === 'agent:created') {
      this._selectedAgent = e.detail.payload;
      this._eventLog = [
        `[${new Date().toLocaleTimeString()}] agent:created — ${e.detail.payload.name}`,
        ...this._eventLog.slice(0, 9),
      ];
    }
  }

  override render() {
    return html`
      <h2>Agent Catalog</h2>
      <p>Template browsing with filters and from-scratch wizard.</p>

      <div class="view-toggle">
        <button class="toggle-btn ${this._view === 'catalog' ? 'active' : ''}"
          @click=${() => { this._view = 'catalog'; }}>Catalog</button>
        <button class="toggle-btn ${this._view === 'wizard' ? 'active' : ''}"
          @click=${() => { this._view = 'wizard'; }}>From-Scratch Wizard</button>
      </div>

      <div class="demo-section" @pages-event=${this._handleEvent}>
        ${this._view === 'catalog'
          ? html`<agent-catalog></agent-catalog>`
          : html`<agent-wizard></agent-wizard>`}
      </div>

      ${this._selectedAgent ? html`
        <div class="selected-panel">
          <h3>Selected / Created Agent</h3>
          <pre>${JSON.stringify(this._selectedAgent, null, 2)}</pre>
        </div>
      ` : ''}

      ${this._eventLog.length > 0 ? html`
        <div class="event-log">
          <h3>Event Log</h3>
          <pre>${this._eventLog.join('\n')}</pre>
        </div>
      ` : ''}
    `;
  }
}
