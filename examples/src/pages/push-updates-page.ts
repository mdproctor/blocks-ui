import { LitElement, html, css, type TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { formatTimestamp } from '../../../packages/blocks-ui-core/src/rendering/format-timestamp.js';

interface SimulatedEvent {
  timestamp: string;
  type: string;
  component: string;
  payload: string;
}

@customElement('blocks-example-push-updates')
export class PushUpdatesPage extends LitElement {
  @state() private _events: SimulatedEvent[] = [];
  @state() private _running = false;
  @state() private _listItems = [
    { id: 'INV-001', status: 'Open', risk: 0.72 },
    { id: 'INV-002', status: 'In Review', risk: 0.45 },
    { id: 'INV-003', status: 'Escalated', risk: 0.91 },
  ];
  @state() private _metrics = [
    { key: 'open-cases', label: 'Open Cases', value: 42 },
    { key: 'avg-risk', label: 'Avg Risk Score', value: 0.68 },
    { key: 'sla-breach', label: 'SLA Breaches', value: 3 },
  ];
  @state() private _executionState = 'RUNNING';
  @state() private _agentsComplete = 1;
  @state() private _agentsTotal = 4;

  private _timer: ReturnType<typeof setInterval> | null = null;

  static override styles = css`
    :host { display: flex; flex-direction: column; padding: 24px; height: 100%; box-sizing: border-box; overflow-y: auto; }
    h2 { margin: 0 0 8px; font-size: 20px; font-weight: 600; color: var(--pages-neutral-12, #111); }
    h3 { margin: 16px 0 8px; font-size: 14px; font-weight: 600; color: var(--pages-neutral-11, #333); }
    .subtitle { font-size: 13px; color: var(--pages-neutral-9, #888); margin: 0 0 16px; }
    .controls { display: flex; gap: 8px; margin-bottom: 16px; }
    .controls button { padding: 6px 16px; border: 1px solid var(--pages-neutral-6, #555); border-radius: 4px; font-size: 13px; cursor: pointer; }
    .controls button.start { background: var(--pages-success-9, #16a34a); color: #fff; border-color: var(--pages-success-9, #16a34a); }
    .controls button.stop { background: var(--pages-error-9, #dc2626); color: #fff; border-color: var(--pages-error-9, #dc2626); }
    .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .panel { border: 1px solid var(--pages-neutral-5, #e0e0e0); border-radius: 6px; padding: 12px; }
    .panel-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--pages-neutral-9, #888); margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; padding: 4px 8px; font-weight: 600; color: var(--pages-neutral-9, #888); font-size: 11px; text-transform: uppercase; border-bottom: 1px solid var(--pages-neutral-5, #e0e0e0); }
    td { padding: 6px 8px; color: var(--pages-neutral-12, #e5e5e5); border-bottom: 1px solid var(--pages-neutral-4, #333); }
    .metric { text-align: center; }
    .metric-value { font-size: 28px; font-weight: 700; color: var(--pages-neutral-12, #e5e5e5); }
    .metric-label { font-size: 11px; color: var(--pages-neutral-9, #888); margin-top: 4px; }
    .status-badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: 600; }
    .status-RUNNING { background: var(--pages-accent-2, #e0e7ff); color: var(--pages-accent-9, #6366f1); }
    .status-COMPLETE { background: var(--pages-success-2, #dcfce7); color: var(--pages-success-9, #16a34a); }
    .event-log { max-height: 200px; overflow-y: auto; border: 1px solid var(--pages-neutral-5, #e0e0e0); border-radius: 6px; padding: 8px; font-size: 12px; font-family: monospace; }
    .event-entry { padding: 3px 0; border-bottom: 1px solid var(--pages-neutral-4, #333); display: flex; gap: 8px; }
    .event-time { color: var(--pages-neutral-9, #888); min-width: 60px; }
    .event-type { font-weight: 600; min-width: 100px; }
    .event-type.update { color: var(--pages-accent-9, #6366f1); }
    .event-type.metric { color: var(--pages-warning-9, #d97706); }
    .event-type.state { color: var(--pages-success-9, #16a34a); }
    .event-payload { color: var(--pages-neutral-12, #e5e5e5); }
    .flash { animation: flash-highlight 0.6s ease-out; }
    @keyframes flash-highlight { 0% { background: var(--pages-accent-3, #1e3a5f); } 100% { background: transparent; } }
  `;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopSimulation();
  }

  private _startSimulation(): void {
    if (this._running) return;
    this._running = true;
    this._timer = setInterval(() => this._simulateEvent(), 1500);
  }

  private _stopSimulation(): void {
    this._running = false;
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  private _simulateEvent(): void {
    const rand = Math.random();
    const now = new Date().toISOString();

    if (rand < 0.35) {
      const idx = Math.floor(Math.random() * this._listItems.length);
      const statuses = ['Open', 'In Review', 'Escalated', 'Resolved'];
      const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
      const newRisk = Math.round((Math.random() * 0.5 + 0.3) * 100) / 100;
      this._listItems = this._listItems.map((item, i) => i === idx ? { ...item, status: newStatus, risk: newRisk } : item);
      this._addEvent({ timestamp: now, type: 'row-update', component: 'list-pane', payload: `${this._listItems[idx].id} → ${newStatus} (risk: ${newRisk})` });
    } else if (rand < 0.65) {
      const idx = Math.floor(Math.random() * this._metrics.length);
      const delta = Math.floor(Math.random() * 5) - 2;
      const m = this._metrics[idx];
      const newVal = m.key === 'avg-risk' ? Math.round((m.value + (Math.random() * 0.1 - 0.05)) * 100) / 100 : Math.max(0, m.value + delta);
      this._metrics = this._metrics.map((met, i) => i === idx ? { ...met, value: newVal } : met);
      this._addEvent({ timestamp: now, type: 'metric-update', component: 'kpi-metric-row', payload: `${m.label}: ${m.value} → ${newVal}` });
    } else {
      if (this._agentsComplete < this._agentsTotal) {
        this._agentsComplete++;
        if (this._agentsComplete >= this._agentsTotal) this._executionState = 'COMPLETE';
        this._addEvent({ timestamp: now, type: 'state-change', component: 'execution-monitor', payload: `Agent ${this._agentsComplete}/${this._agentsTotal} complete` });
      } else {
        this._agentsComplete = 1;
        this._executionState = 'RUNNING';
        this._addEvent({ timestamp: now, type: 'state-change', component: 'execution-monitor', payload: 'New execution started' });
      }
    }
  }

  private _addEvent(event: SimulatedEvent): void {
    this._events = [event, ...this._events.slice(0, 19)];
  }

  override render(): TemplateResult {
    return html`
      <h2>Push Updates via EventStreamController</h2>
      <p class="subtitle">
        Simulates live push events driving list-pane row updates, kpi-metric-row value changes, and execution-monitor state transitions.
        In production, these arrive via WebSocket through PushMixin / EventStreamController.
      </p>
      <div class="controls">
        ${this._running
          ? html`<button class="stop" @click=${this._stopSimulation}>Stop Simulation</button>`
          : html`<button class="start" @click=${this._startSimulation}>Start Simulation</button>`
        }
      </div>

      <div class="grid">
        ${this._renderListPanel()}
        ${this._renderMetricsPanel()}
        ${this._renderExecutionPanel()}
      </div>

      <h3>Event Log</h3>
      <div class="event-log">
        ${this._events.length === 0
          ? html`<div style="color: var(--pages-neutral-9, #888); padding: 8px;">Click "Start Simulation" to see push events...</div>`
          : this._events.map(e => html`
            <div class="event-entry">
              <span class="event-time">${formatTimestamp(e.timestamp, { style: 'compact' })}</span>
              <span class="event-type ${e.type === 'row-update' ? 'update' : e.type === 'metric-update' ? 'metric' : 'state'}">${e.type}</span>
              <span style="color: var(--pages-neutral-9, #888)">${e.component}</span>
              <span class="event-payload">${e.payload}</span>
            </div>
          `)
        }
      </div>
    `;
  }

  private _renderListPanel(): TemplateResult {
    return html`
      <div class="panel">
        <div class="panel-title">List Pane (row updates)</div>
        <table>
          <tr><th>Case</th><th>Status</th><th>Risk</th></tr>
          ${this._listItems.map(item => html`
            <tr>
              <td>${item.id}</td>
              <td>${item.status}</td>
              <td>${item.risk.toFixed(2)}</td>
            </tr>
          `)}
        </table>
      </div>
    `;
  }

  private _renderMetricsPanel(): TemplateResult {
    return html`
      <div class="panel">
        <div class="panel-title">KPI Metrics (push replaces polling)</div>
        ${this._metrics.map(m => html`
          <div class="metric" style="margin-bottom: 12px;">
            <div class="metric-value">${typeof m.value === 'number' && m.key === 'avg-risk' ? m.value.toFixed(2) : m.value}</div>
            <div class="metric-label">${m.label}</div>
          </div>
        `)}
      </div>
    `;
  }

  private _renderExecutionPanel(): TemplateResult {
    return html`
      <div class="panel">
        <div class="panel-title">Execution Monitor (state transitions)</div>
        <div style="text-align: center; margin: 12px 0;">
          <span class="status-badge status-${this._executionState}">${this._executionState}</span>
        </div>
        <div style="text-align: center; font-size: 13px; color: var(--pages-neutral-12, #e5e5e5);">
          Agents: ${this._agentsComplete} / ${this._agentsTotal} complete
        </div>
        <div style="margin-top: 8px; height: 6px; background: var(--pages-neutral-3, #333); border-radius: 3px; overflow: hidden;">
          <div style="height: 100%; width: ${(this._agentsComplete / this._agentsTotal) * 100}%; background: var(--pages-accent-9, #6366f1); border-radius: 3px; transition: width 0.3s;"></div>
        </div>
      </div>
    `;
  }
}
