import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { onPagesEvent } from '@casehubio/pages-data';
import type { TabDefinition } from '@casehubio/blocks-ui-detail-pane';
import '@casehubio/blocks-ui-detail-pane';
import '@casehubio/blocks-ui-kpi-metric-row';
import '@casehubio/blocks-ui-evolution-config';
import '@casehubio/blocks-ui-audit-trail-viewer';
import '@casehubio/blocks-ui-trust-score-panel';
import type {
  EvolutionStateSnapshot, ImprovementStreamView, ConductorInboxEntry,
  DenyPatternView, WatchPattern, StageDescriptor, CategoryDescriptor,
  GatePolicy,
} from '@casehubio/blocks-ui-evolution-config';
import { EvolutionApi, EvolutionEventTopics } from '@casehubio/blocks-ui-evolution-config';
import '@casehubio/blocks-ui-agent-detail';

export interface EvolutionWorkbenchProps {
  endpoint?: string;
  caseId?: string;
  tenancyId?: string;
  tabs?: readonly TabDefinition[];
  pushUrl?: string;
  pushTopics?: readonly string[];
  state?: EvolutionStateSnapshot;
  streams?: readonly ImprovementStreamView[];
  inbox?: readonly ConductorInboxEntry[];
  denyPatterns?: DenyPatternView;
  watchPatterns?: readonly WatchPattern[];
  stages?: readonly StageDescriptor[];
  categories?: readonly CategoryDescriptor[];
  gatePolicy?: GatePolicy;
}

@customElement('blocks-evolution-workbench')
export class EvolutionWorkbench extends LitElement {
  @property({ type: String }) endpoint?: string;
  @property({ type: String }) caseId?: string;
  @property({ type: String }) tenancyId?: string;
  @property({ type: Array }) tabs?: readonly TabDefinition[];
  @property({ type: String }) pushUrl?: string;
  @property({ type: Array }) pushTopics?: readonly string[];

  @property({ type: Object, attribute: false }) state?: EvolutionStateSnapshot;
  @property({ type: Array, attribute: false }) streams?: readonly ImprovementStreamView[];
  @property({ type: Array, attribute: false }) inbox?: readonly ConductorInboxEntry[];
  @property({ type: Object, attribute: false }) denyPatterns?: DenyPatternView;
  @property({ type: Array, attribute: false }) watchPatterns?: readonly WatchPattern[];
  @property({ type: Array, attribute: false }) stages?: readonly StageDescriptor[];
  @property({ type: Array, attribute: false }) categories?: readonly CategoryDescriptor[];
  @property({ type: Object, attribute: false }) gatePolicy?: GatePolicy;

  @state() private _loading = false;
  @state() private _error: string | null = null;
  @state() private _fetchedState: EvolutionStateSnapshot | null = null;
  @state() private _selectedAgent: { improvementCaseId: string } | null = null;

  private _api?: EvolutionApi;
  private _unsubs: Array<() => void> = [];

  private get _snapshot(): EvolutionStateSnapshot | null {
    return this.state ?? this._fetchedState;
  }

  private _builtInTabs(): TabDefinition[] {
    return [
      { id: 'streams', label: 'Streams', tagName: 'div', order: 10,
        badge: () => {
          const s = this._snapshot;
          return s && s.activeImprovementCount > 0 ? String(s.activeImprovementCount) : null;
        },
        renderContent: () => this._renderStreams() },
      { id: 'inbox', label: 'Inbox', tagName: 'div', order: 20,
        badge: () => {
          const s = this._snapshot;
          return s && s.pendingInboxCount > 0 ? String(s.pendingInboxCount) : null;
        },
        renderContent: () => this._renderInbox() },
      { id: 'audit', label: 'Audit', tagName: 'div', order: 30,
        renderContent: () => this._renderAudit() },
      { id: 'config', label: 'Configuration', tagName: 'div', order: 40,
        renderContent: () => this._renderConfig() },
      { id: 'health', label: 'Health', tagName: 'div', order: 50,
        renderContent: () => this._renderHealth() },
    ];
  }

  private _allTabs(): TabDefinition[] {
    const built = this._builtInTabs();
    const custom = this.tabs ? [...this.tabs] : [];
    return [...built, ...custom].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  static override styles = css`
    :host { display: flex; flex-direction: column; height: 100%; font-family: var(--pages-font-family, system-ui); container-type: inline-size; container-name: evolution-workbench; }
    .summary { flex-shrink: 0; border-bottom: 1px solid var(--pages-neutral-4, #e0e0e0); }
    .tabs { flex: 1; overflow: hidden; }
    .tab-content { padding: 16px; overflow: auto; height: 100%; box-sizing: border-box; }
    .section-header {
      font-size: 13px; font-weight: 600; margin: 16px 0 8px;
      padding-bottom: 4px; border-bottom: 1px solid var(--pages-neutral-4, #e0e0e0);
    }
    .loading { padding: 32px; text-align: center; color: var(--pages-neutral-9, #737373); }
    .error { padding: 16px; background: var(--pages-danger-3, #fee); color: var(--pages-danger-11, #c00); border-radius: 4px; margin: 16px; }
    .metric-grid {
      display: flex; gap: 16px; padding: 12px 16px; flex-wrap: wrap;
    }
    .metric-card {
      display: flex; flex-direction: column; align-items: center; min-width: 80px;
    }
    .metric-value { font-size: 24px; font-weight: 700; color: var(--pages-neutral-12, #222); }
    .metric-label { font-size: 11px; color: var(--pages-neutral-9, #737373); text-transform: uppercase; letter-spacing: 0.05em; }
    .status-badge {
      display: inline-block; padding: 2px 8px; border-radius: 10px;
      font-size: 12px; font-weight: 500;
    }
    .status-badge--ok { background: var(--pages-success-3, #dcfce7); color: var(--pages-success-11, #166534); }
    .status-badge--warn { background: var(--pages-warning-3, #fef3c7); color: var(--pages-warning-11, #92400e); }
    .status-badge--danger { background: var(--pages-danger-3, #fee); color: var(--pages-danger-11, #c00); }
    .empty-tab { padding: 24px; text-align: center; color: var(--pages-neutral-9, #737373); }

    @container evolution-workbench (max-width: 600px) {
      .metric-grid { gap: 8px; padding: 8px; }
      .metric-card { min-width: 60px; }
      .metric-value { font-size: 18px; }
      .metric-label { font-size: 10px; }
    }

    @container evolution-workbench (max-width: 400px) {
      .metric-grid { flex-direction: column; align-items: stretch; }
      .metric-card { flex-direction: row; justify-content: space-between; min-width: unset; }
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Evolution workbench');
    if (this.endpoint && !this._api) {
      this._api = new EvolutionApi(this.endpoint);
    }
    if (this._api && this.caseId && this.tenancyId) {
      this._fetchState();
    }
    this._unsubs.push(
      onPagesEvent(this, EvolutionEventTopics.DENY_PATTERN_CHANGED, () => this._refreshState()),
      onPagesEvent(this, EvolutionEventTopics.WATCH_PATTERN_CHANGED, () => this._refreshState()),
      onPagesEvent(this, EvolutionEventTopics.GATE_POLICY_CHANGED, () => this._refreshState()),
      onPagesEvent(this, EvolutionEventTopics.GATE_RESOLVED, () => this._refreshState()),
      onPagesEvent(this, EvolutionEventTopics.STREAM_CHANGED, () => this._refreshState()),
      onPagesEvent<{ improvementCaseId: string }>(this, 'evolution:agent-selected', (p) => { this._selectedAgent = { improvementCaseId: p.improvementCaseId }; }),
      onPagesEvent(this, 'evolution:agent-deselected', () => { this._selectedAgent = null; }),
    );
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubs.forEach(u => u());
    this._unsubs = [];
  }

  configure(props: Partial<EvolutionWorkbenchProps>): void {
    if (props.endpoint !== undefined) this.endpoint = props.endpoint;
    if (props.caseId !== undefined) this.caseId = props.caseId;
    if (props.tenancyId !== undefined) this.tenancyId = props.tenancyId;
    if (props.tabs !== undefined) this.tabs = props.tabs;
    if (props.pushUrl !== undefined) this.pushUrl = props.pushUrl;
    if (props.pushTopics !== undefined) this.pushTopics = props.pushTopics;
    if (props.state !== undefined) this.state = props.state;
    if (props.streams !== undefined) this.streams = props.streams;
    if (props.inbox !== undefined) this.inbox = props.inbox;
    if (props.denyPatterns !== undefined) this.denyPatterns = props.denyPatterns;
    if (props.watchPatterns !== undefined) this.watchPatterns = props.watchPatterns;
    if (props.stages !== undefined) this.stages = props.stages;
    if (props.categories !== undefined) this.categories = props.categories;
    if (props.gatePolicy !== undefined) this.gatePolicy = props.gatePolicy;
  }

  private async _fetchState(): Promise<void> {
    if (!this._api || !this.caseId || !this.tenancyId) return;
    this._loading = true;
    this._error = null;
    try {
      this._fetchedState = await this._api.getEvolutionState(this.caseId, this.tenancyId);
    } catch (e) {
      this._error = e instanceof Error ? e.message : 'Failed to load evolution state';
    } finally {
      this._loading = false;
    }
  }

  private _refreshState(): void {
    if (this._api && this.caseId && this.tenancyId) {
      this._fetchState();
    }
  }

  private _circuitBreakerClass(state: string): string {
    if (state === 'CLOSED') return 'status-badge--ok';
    if (state === 'HALF_OPEN') return 'status-badge--warn';
    return 'status-badge--danger';
  }

  private _renderSummary() {
    const s = this._snapshot;
    if (!s) return nothing;

    return html`
      <div class="metric-grid">
        <div class="metric-card">
          <span class="metric-value">${Math.round(s.healthScore * 100)}%</span>
          <span class="metric-label">Health</span>
        </div>
        <div class="metric-card">
          <span class="metric-value">${s.activeImprovementCount}</span>
          <span class="metric-label">Active</span>
        </div>
        <div class="metric-card">
          <span class="metric-value" style="${s.pendingInboxCount > 0 ? 'color:var(--pages-warning-11,#92400e)' : ''}">${s.pendingInboxCount}</span>
          <span class="metric-label">Inbox</span>
        </div>
        <div class="metric-card">
          <span class="status-badge ${this._circuitBreakerClass(s.circuitBreakerState)}">${s.circuitBreakerState}</span>
          <span class="metric-label">Circuit Breaker</span>
        </div>
        <div class="metric-card">
          <span class="status-badge ${s.evolutionEnabled ? 'status-badge--ok' : 'status-badge--warn'}">${s.evolutionEnabled ? 'ON' : 'OFF'}</span>
          <span class="metric-label">Enabled</span>
        </div>
      </div>
    `;
  }

  private _renderStreams() {
    return html`
      <div class="tab-content">
        <blocks-evolution-streams
          .endpoint=${this.endpoint}
          .caseId=${this.caseId}
          .tenancyId=${this.tenancyId}
          .streams=${this.streams}
        ></blocks-evolution-streams>
        ${this._selectedAgent ? html`
          <blocks-agent-detail
            .endpoint=${this.endpoint}
            .caseId=${this.caseId}
            .tenancyId=${this.tenancyId}
            .improvementCaseId=${this._selectedAgent.improvementCaseId}
          ></blocks-agent-detail>
        ` : nothing}
      </div>
    `;
  }

  private _renderInbox() {
    return html`
      <div class="tab-content">
        <blocks-evolution-inbox
          .endpoint=${this.endpoint}
          .caseId=${this.caseId}
          .tenancyId=${this.tenancyId}
          .inbox=${this.inbox}
        ></blocks-evolution-inbox>
      </div>
    `;
  }

  private _renderAudit() {
    const auditEndpoint = this.endpoint ? `${this.endpoint}/audit` : undefined;
    return html`
      <div class="tab-content">
        <blocks-audit-trail-viewer
          .endpoint=${auditEndpoint}
        ></blocks-audit-trail-viewer>
      </div>
    `;
  }

  private _renderConfig() {
    return html`
      <div class="tab-content">
        <div class="section-header">Deny Patterns</div>
        <blocks-deny-pattern-editor
          .endpoint=${this.endpoint}
          .caseId=${this.caseId}
          .tenancyId=${this.tenancyId}
          .patterns=${this.denyPatterns}
          .streams=${this.streams}
        ></blocks-deny-pattern-editor>

        <div class="section-header">Watch Patterns</div>
        <blocks-watch-pattern-editor
          .endpoint=${this.endpoint}
          .caseId=${this.caseId}
          .tenancyId=${this.tenancyId}
          .patterns=${this.watchPatterns}
          .categories=${this.categories}
        ></blocks-watch-pattern-editor>

        <div class="section-header">Gate Policy</div>
        <blocks-gate-policy-editor
          .endpoint=${this.endpoint}
          .caseId=${this.caseId}
          .tenancyId=${this.tenancyId}
          .stages=${this.stages}
          .policy=${this.gatePolicy}
          .streams=${this.streams}
        ></blocks-gate-policy-editor>
      </div>
    `;
  }

  private _renderHealth() {
    const s = this._snapshot;
    if (!s) return html`<div class="tab-content"><div class="empty-tab">No health data available.</div></div>`;
    return html`
      <div class="tab-content">
        <blocks-trust-score-panel
          .score=${s.healthScore}
          mode="full"
        ></blocks-trust-score-panel>
      </div>
    `;
  }

  override render() {
    this.setAttribute('aria-busy', String(this._loading));
    if (this._loading && !this._snapshot) return html`<div class="loading">Loading evolution workbench...</div>`;
    if (this._error && !this._snapshot) return html`<div class="error">${this._error}</div>`;

    const allTabs = this._allTabs();

    return html`
      <div class="summary">${this._renderSummary()}</div>
      <div class="tabs">
        <blocks-detail-pane
          ?standalone=${true}
          .tabs=${allTabs}
        ></blocks-detail-pane>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'blocks-evolution-workbench': EvolutionWorkbench;
  }
}
