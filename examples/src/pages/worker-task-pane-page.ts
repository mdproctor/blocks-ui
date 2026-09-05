import { LitElement, html, css, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../../../components/worker-task-pane/src/worker-task-pane.js';
import type { WorkerTaskResponse, WorkspaceDefinition } from '../../../components/worker-task-pane/src/types.js';
import type { TabDefinition } from '../../../components/detail-pane/src/types.js';

const SEED_TASKS: WorkerTaskResponse[] = [
  {
    taskId: 'wt-001', capabilityTag: 'entity-resolution', caseId: 'INV-003',
    dispatchedAt: '2026-09-01T09:00:00Z',
    commandParams: { entityIds: ['E-100', 'E-101'], matchThreshold: 0.7 },
    investigationSummary: { flagReason: 'Name match across jurisdictions', riskScore: 0.82, amount: 125000, currency: 'USD', status: 'Open' },
  },
  {
    taskId: 'wt-002', capabilityTag: 'pattern-analysis', caseId: 'INV-007', assigneeId: 'user-demo',
    dispatchedAt: '2026-09-01T10:30:00Z',
    commandParams: { patternType: 'structuring', windowHours: 48 },
    investigationSummary: { flagReason: 'Threshold splitting detected', riskScore: 0.65, amount: 28500, currency: 'EUR', status: 'In Review' },
  },
  {
    taskId: 'wt-003', capabilityTag: 'osint-screening', caseId: 'INV-012',
    dispatchedAt: '2026-09-01T11:15:00Z',
    commandParams: { screeningType: 'pep', region: 'EU' },
    investigationSummary: { flagReason: 'PEP match — ministerial appointment 2024', riskScore: 0.91, amount: 500000, currency: 'GBP', status: 'Pending' },
  },
  {
    taskId: 'wt-004', capabilityTag: 'entity-resolution', caseId: 'INV-019', assigneeId: 'user-demo',
    dispatchedAt: '2026-09-02T08:00:00Z',
    commandParams: { entityIds: ['E-205'], matchThreshold: 0.85 },
    investigationSummary: { flagReason: 'Address discrepancy', riskScore: 0.45, amount: 12000, currency: 'USD', status: 'Open' },
  },
  {
    taskId: 'wt-005', capabilityTag: 'pattern-analysis', caseId: 'INV-021',
    dispatchedAt: '2026-09-02T09:30:00Z',
    commandParams: { patternType: 'layering', windowHours: 72 },
    investigationSummary: { flagReason: 'Rapid fund transfers across 4 accounts', riskScore: 0.78, amount: 95000, currency: 'USD', status: 'Escalated' },
  },
];

class StubEntityWorkspace extends LitElement {
  static override styles = css`
    :host { display: block; padding: 16px; }
    .fields { display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; font-size: 13px; color: var(--pages-neutral-12, #e5e5e5); }
    .label { font-weight: 600; color: var(--pages-neutral-9, #888); }
    button { margin-top: 12px; padding: 6px 16px; cursor: pointer; border: 1px solid var(--pages-neutral-6, #555); border-radius: 4px; background: var(--pages-accent-3, #1e3a5f); color: var(--pages-neutral-12, #e5e5e5); font-size: 13px; }
    button:hover { background: var(--pages-accent-4, #264d73); }
  `;
  @state() private _ctx: any = null;
  set taskContext(ctx: any) { this._ctx = ctx; }
  private _emitResult(): void {
    this.dispatchEvent(new CustomEvent('workspace-result', {
      detail: { fields: { resolvedEntityId: 'E-RESOLVED', matchScore: 0.92 }, confidence: 0.88 },
    }));
  }
  override render(): TemplateResult {
    if (!this._ctx) return html`<p style="color: var(--pages-neutral-9, #888)">Waiting for task context...</p>`;
    return html`
      <h4 style="margin:0 0 8px; font-size: 14px; font-weight: 600">Entity Resolution Workspace</h4>
      <div class="fields">
        <span class="label">Entity IDs:</span><span>${JSON.stringify(this._ctx.commandParams?.entityIds)}</span>
        <span class="label">Case:</span><span>${this._ctx.caseId}</span>
        <span class="label">Threshold:</span><span>${this._ctx.commandParams?.matchThreshold}</span>
      </div>
      <button @click=${this._emitResult}>Simulate Result (confidence: 88%)</button>
    `;
  }
}
if (!customElements.get('stub-workspace-entity')) customElements.define('stub-workspace-entity', StubEntityWorkspace);

class StubPatternWorkspace extends LitElement {
  static override styles = css`
    :host { display: block; padding: 16px; }
    button { margin-top: 12px; padding: 6px 16px; cursor: pointer; border: 1px solid var(--pages-neutral-6, #555); border-radius: 4px; background: var(--pages-accent-3, #1e3a5f); color: var(--pages-neutral-12, #e5e5e5); font-size: 13px; }
    button:hover { background: var(--pages-accent-4, #264d73); }
  `;
  @state() private _ctx: any = null;
  set taskContext(ctx: any) { this._ctx = ctx; }
  private _emitResult(): void {
    this.dispatchEvent(new CustomEvent('workspace-result', {
      detail: { fields: { patternConfirmed: true, transactionCount: 4 }, confidence: 0.72 },
    }));
  }
  override render(): TemplateResult {
    if (!this._ctx) return html`<p style="color: var(--pages-neutral-9, #888)">Waiting...</p>`;
    return html`
      <h4 style="margin:0 0 8px; font-size: 14px; font-weight: 600">Pattern Analysis Workspace</h4>
      <p style="font-size:13px; margin: 0 0 8px">Pattern: ${this._ctx.commandParams?.patternType}, Window: ${this._ctx.commandParams?.windowHours}h</p>
      <button @click=${this._emitResult}>Simulate Result (confidence: 72%)</button>
    `;
  }
}
if (!customElements.get('stub-workspace-pattern')) customElements.define('stub-workspace-pattern', StubPatternWorkspace);

class StubOsintWorkspace extends LitElement {
  static override styles = css`
    :host { display: block; padding: 16px; }
    button { margin-top: 12px; padding: 6px 16px; cursor: pointer; border: 1px solid var(--pages-neutral-6, #555); border-radius: 4px; background: var(--pages-accent-3, #1e3a5f); color: var(--pages-neutral-12, #e5e5e5); font-size: 13px; }
    button:hover { background: var(--pages-accent-4, #264d73); }
  `;
  @state() private _ctx: any = null;
  set taskContext(ctx: any) { this._ctx = ctx; }
  private _emitResult(): void {
    this.dispatchEvent(new CustomEvent('workspace-result', {
      detail: { fields: { pepConfirmed: true, sanctionsHit: false }, confidence: 0.95 },
    }));
  }
  override render(): TemplateResult {
    if (!this._ctx) return html`<p style="color: var(--pages-neutral-9, #888)">Waiting...</p>`;
    return html`
      <h4 style="margin:0 0 8px; font-size: 14px; font-weight: 600">OSINT Screening Workspace</h4>
      <p style="font-size:13px; margin: 0 0 8px">Type: ${this._ctx.commandParams?.screeningType}, Region: ${this._ctx.commandParams?.region}</p>
      <button @click=${this._emitResult}>Simulate Result (confidence: 95%)</button>
    `;
  }
}
if (!customElements.get('stub-workspace-osint')) customElements.define('stub-workspace-osint', StubOsintWorkspace);

class StubContextSummary extends LitElement {
  static override styles = css`
    :host { display: block; padding: 12px; font-size: 13px; }
    .row { display: flex; gap: 8px; margin-bottom: 6px; }
    .key { font-weight: 600; min-width: 120px; color: var(--pages-neutral-9, #888); }
    .value { color: var(--pages-neutral-12, #e5e5e5); }
  `;
  @property({ attribute: false }) item: any = null;
  override render(): TemplateResult {
    if (!this.item) return html`<p style="color: var(--pages-neutral-9, #888)">No item selected</p>`;
    const summary = this.item.investigationSummary ?? {};
    return html`${Object.entries(summary).map(([k, v]) => html`<div class="row"><span class="key">${k}:</span><span class="value">${String(v)}</span></div>`)}`;
  }
}
if (!customElements.get('stub-context-summary')) customElements.define('stub-context-summary', StubContextSummary);

class StubContextHistory extends LitElement {
  static override styles = css`
    :host { display: block; padding: 12px; font-size: 13px; }
    .entry { padding: 8px 0; border-bottom: 1px solid var(--pages-neutral-4, #333); }
    .entry-time { font-size: 11px; color: var(--pages-neutral-9, #888); }
    .entry-text { color: var(--pages-neutral-12, #e5e5e5); margin-top: 2px; }
  `;
  @property({ attribute: false }) item: any = null;
  override render(): TemplateResult {
    if (!this.item) return html`<p style="color: var(--pages-neutral-9, #888)">No item</p>`;
    return html`
      <div class="entry">
        <div class="entry-time">${this.item.dispatchedAt ?? 'Unknown date'}</div>
        <div class="entry-text">Task dispatched — ${this.item.capabilityTag} investigation for case ${this.item.caseId}</div>
      </div>
      <div class="entry">
        <div class="entry-time">Auto-generated</div>
        <div class="entry-text">Risk score: ${this.item.investigationSummary?.riskScore ?? '—'} — ${this.item.investigationSummary?.flagReason ?? 'No flag reason'}</div>
      </div>
    `;
  }
}
if (!customElements.get('stub-context-history')) customElements.define('stub-context-history', StubContextHistory);

const WORKSPACES: WorkspaceDefinition[] = [
  { capabilityTag: 'entity-resolution', tagName: 'stub-workspace-entity', label: 'Entity Resolution' },
  { capabilityTag: 'pattern-analysis', tagName: 'stub-workspace-pattern', label: 'Pattern Analysis' },
  { capabilityTag: 'osint-screening', tagName: 'stub-workspace-osint', label: 'OSINT Screening' },
];

const CONTEXT_TABS: TabDefinition[] = [
  { id: 'summary', label: 'Summary', tagName: 'stub-context-summary' },
  { id: 'history', label: 'History', tagName: 'stub-context-history' },
];

@customElement('blocks-example-worker-task-pane')
export class WorkerTaskPanePage extends LitElement {
  @state() private _layout: 'split' | 'stacked' = 'split';
  @state() private _showContext = true;
  @state() private _showWorkspace = true;
  @state() private _claimEnabled = false;
  @state() private _eventLog: string[] = [];

  static override styles = css`
    :host { display: flex; flex-direction: column; padding: 24px; height: 100%; box-sizing: border-box; }
    h2 { margin: 0 0 8px; font-size: 20px; font-weight: 600; color: var(--pages-neutral-12, #111); flex-shrink: 0; }
    .controls { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; flex-shrink: 0; flex-wrap: wrap; }
    .controls label { font-size: 13px; color: var(--pages-neutral-11, #555); font-weight: 600; display: flex; align-items: center; gap: 4px; }
    .controls select { padding: 6px 12px; border: 1px solid var(--pages-neutral-6, #ccc); border-radius: 4px; font-size: 13px; }
    .pane-container { flex: 1; min-height: 0; border: 1px solid var(--pages-neutral-5, #e0e0e0); border-radius: 6px; overflow: hidden; }
    .event-log { flex-shrink: 0; margin-top: 12px; padding: 8px 12px; background: var(--pages-neutral-2, #f5f5f5); border-radius: 4px; max-height: 80px; overflow-y: auto; font-size: 12px; font-family: monospace; color: var(--pages-neutral-11, #555); }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('worker-task:responded', this._logAction);
    this.addEventListener('worker-task:declined', this._logAction);
    this.addEventListener('worker-task:claimed', this._logAction);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('worker-task:responded', this._logAction);
    this.removeEventListener('worker-task:declined', this._logAction);
    this.removeEventListener('worker-task:claimed', this._logAction);
  }

  private _logAction = (e: Event): void => {
    const ce = e as CustomEvent;
    this._eventLog = [
      `[${new Date().toLocaleTimeString()}] ${ce.type}: ${JSON.stringify(ce.detail).slice(0, 100)}`,
      ...this._eventLog.slice(0, 9),
    ];
  };

  override render(): TemplateResult {
    return html`
      <h2>Worker Task Pane</h2>
      <div class="controls">
        <label>Layout:
          <select @change=${(e: Event) => { this._layout = (e.target as HTMLSelectElement).value as any; }}>
            <option value="split">Split</option>
            <option value="stacked">Stacked</option>
          </select>
        </label>
        <label><input type="checkbox" ?checked=${this._showContext}
          @change=${(e: Event) => { this._showContext = (e.target as HTMLInputElement).checked; }}>
          Show Context</label>
        <label><input type="checkbox" ?checked=${this._showWorkspace}
          @change=${(e: Event) => { this._showWorkspace = (e.target as HTMLInputElement).checked; }}>
          Show Workspace</label>
        <label><input type="checkbox" ?checked=${this._claimEnabled}
          @change=${(e: Event) => { this._claimEnabled = (e.target as HTMLInputElement).checked; }}>
          Enable Claim</label>
      </div>
      <div class="pane-container">
        <blocks-worker-task-pane
          .layout=${this._layout}
          .data=${SEED_TASKS}
          .workspaces=${WORKSPACES}
          .contextTabs=${CONTEXT_TABS}
          .identity=${{ userId: 'user-demo', displayName: 'Demo User', groups: ['entity-resolution', 'pattern-analysis', 'osint-screening'] }}
          .declineReasons=${['Out of clearance', 'Insufficient data', 'Conflict of interest']}
          ?show-context=${this._showContext}
          ?show-workspace=${this._showWorkspace}
          claim-endpoint=${this._claimEnabled ? '/api/mock-claim' : ''}
          selection-topic="demo-worker-task"
        ></blocks-worker-task-pane>
      </div>
      ${this._eventLog.length ? html`<div class="event-log">${this._eventLog.map(l => html`<div>${l}</div>`)}</div>` : ''}
    `;
  }
}
