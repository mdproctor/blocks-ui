import { LitElement, html, css, nothing, type TemplateResult, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { emitPagesEvent } from '@casehubio/pages-data';
import { renderSparkline } from '@casehubio/pages-ui-components';
import { LiveRegionMixin } from '@casehubio/pages-primitives';
import { PushMixin } from '@casehubio/pages-component';

export const KpiMetricRowTopics = {
  CARD_CLICKED: 'kpi.card-clicked',
} as const;

export interface MetricDefinition {
  readonly key: string;
  readonly value: number | string;
  readonly label: string;
  readonly unit?: string;
  readonly trend?: { readonly direction: 'up' | 'down' | 'stable'; readonly delta: string };
  readonly sparkline?: readonly number[];
  readonly status?: 'normal' | 'warning' | 'critical';
}

const TREND_ARROWS: Record<string, string> = { up: '▲', down: '▼', stable: '—' };

@customElement('blocks-kpi-metric-row')
export class KpiMetricRow extends PushMixin(LiveRegionMixin(LitElement)) {
  @property({ type: Array }) metrics: MetricDefinition[] = [];
  @property({ type: String }) endpoint: string | null = null;
  @property({ type: Number }) columns: number | null = null;
  @property({ type: String, reflect: true }) density: 'comfortable' | 'compact' | 'dense' = 'comfortable';
  @property({ type: Number, attribute: 'refresh-interval' }) refreshInterval: number | null = null;

  @state() private _loading = false;
  @state() private _error: string | null = null;
  private _refreshTimer: ReturnType<typeof setInterval> | null = null;

  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, system-ui); }

    .grid {
      display: grid;
      gap: var(--pages-space-3, 12px);
    }

    .empty {
      text-align: center;
      padding: var(--pages-space-6, 24px);
      color: var(--pages-neutral-9, #888);
      font-size: var(--pages-font-size-base, 14px);
    }

    .error {
      text-align: center;
      padding: var(--pages-space-4, 16px);
      color: var(--pages-danger-9, #dc2626);
      font-size: var(--pages-font-size-sm, 12px);
    }

    .card {
      background: var(--pages-neutral-2, #fafafa);
      border-radius: var(--pages-radius-md, 6px);
      padding: var(--pages-space-4, 16px);
      border-left: 3px solid transparent;
      cursor: pointer;
      transition: background var(--pages-duration-fast, 120ms) var(--pages-ease-out);
      outline: none;
    }

    .card:hover { background: var(--pages-neutral-3, #f5f5f5); }
    .card:focus-visible { outline: 2px solid var(--pages-accent-9, #2563eb); outline-offset: 2px; }

    .card.status-normal { border-left-color: var(--pages-success-9, #16a34a); }
    .card.status-warning { border-left-color: var(--pages-warning-9, #d97706); }
    .card.status-critical { border-left-color: var(--pages-danger-9, #dc2626); }

    .value-row { display: flex; align-items: baseline; gap: var(--pages-space-1, 4px); }

    .value {
      font-size: var(--pages-font-size-2xl, 24px);
      font-weight: var(--pages-font-weight-bold, 700);
      color: var(--pages-neutral-12, #111);
      font-variant-numeric: tabular-nums;
    }

    .unit {
      font-size: var(--pages-font-size-sm, 12px);
      color: var(--pages-neutral-9, #888);
    }

    .label {
      font-size: var(--pages-font-size-sm, 12px);
      color: var(--pages-neutral-9, #888);
      margin-top: var(--pages-space-1, 4px);
    }

    .trend {
      display: inline-flex;
      align-items: center;
      gap: var(--pages-space-0-5, 2px);
      font-size: var(--pages-font-size-xs, 11px);
      margin-top: var(--pages-space-1, 4px);
    }

    .trend.up { color: var(--pages-success-9, #16a34a); }
    .trend.down { color: var(--pages-danger-9, #dc2626); }
    .trend.stable { color: var(--pages-neutral-9, #888); }

    .sparkline { margin-top: var(--pages-space-2, 8px); }
    .card.status-warning .sparkline { color: var(--pages-warning-9, #d97706); }
    .card.status-critical .sparkline { color: var(--pages-danger-9, #dc2626); }
    .card.status-normal .sparkline { color: var(--pages-success-9, #16a34a); }
    .sparkline { color: var(--pages-accent-9, #2563eb); }

    .skeleton-card {
      background: var(--pages-neutral-3, #f5f5f5);
      border-radius: var(--pages-radius-md, 6px);
      padding: var(--pages-space-4, 16px);
      min-height: 80px;
      animation: shimmer 1.5s ease-in-out infinite;
    }

    @keyframes shimmer {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @media (prefers-reduced-motion: reduce) {
      .card { transition: none; }
      .skeleton-card { animation: none; }
    }

    :host([density="compact"]) .card {
      padding: var(--pages-space-3, 12px);
    }

    :host([density="compact"]) .value {
      font-size: var(--pages-font-size-xl, 20px);
    }

    :host([density="dense"]) .card {
      padding: var(--pages-space-2, 8px);
    }

    :host([density="dense"]) .value {
      font-size: var(--pages-font-size-lg, 16px);
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this._setupPush();
    this._startRefreshTimer();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopRefreshTimer();
  }

  protected override onPushEvent(event: unknown): void {
    this._applyMetricUpdate(event as MetricDefinition);
    this._stopRefreshTimer();
  }

  private _startRefreshTimer(): void {
    this._stopRefreshTimer();
    if (this.pushUrl) return;
    if (this.refreshInterval && this.refreshInterval > 0 && this.endpoint) {
      this._refreshTimer = setInterval(() => this._fetchMetrics(), this.refreshInterval);
    }
  }

  private _stopRefreshTimer(): void {
    if (this._refreshTimer !== null) {
      clearInterval(this._refreshTimer);
      this._refreshTimer = null;
    }
  }

  private get _gridMinmax(): string {
    switch (this.density) {
      case 'dense':
        return '90px';
      case 'compact':
        return '120px';
      default:
        return '160px';
    }
  }

  private get _sparklineHeight(): number {
    switch (this.density) {
      case 'dense': return 24;
      case 'compact': return 32;
      default: return 40;
    }
  }

  override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (changed.has('endpoint') && this.endpoint) {
      this._fetchMetrics();
    }
    if (changed.has('refreshInterval') || changed.has('endpoint')) {
      this._startRefreshTimer();
    }
  }

  private _applyMetricUpdate(update: MetricDefinition): void {
    const index = this.metrics.findIndex(m => m.key === update.key);
    if (index >= 0) {
      this.metrics = [...this.metrics.slice(0, index), update, ...this.metrics.slice(index + 1)];
      this.announce(`${update.label ?? update.key} updated`);
    } else {
      this.metrics = [...this.metrics, update];
    }
  }

  override render() {
    const gridStyle = this.columns
      ? `grid-template-columns: repeat(${this.columns}, 1fr)`
      : `grid-template-columns: repeat(auto-fill, minmax(${this._gridMinmax}, 1fr))`;

    if (this._loading) {
      const count = this.columns ?? 3;
      return html`
        <div class="grid" role="list" style="${gridStyle}">
          ${Array.from({ length: count }, () => html`<div class="skeleton-card"></div>`)}
        </div>
      `;
    }

    if (this._error) {
      return html`<div class="error">${this._error}</div>`;
    }

    if (this.metrics.length === 0) {
      return html`<div class="empty">No metrics available</div>`;
    }

    return html`
      <div class="grid" role="list" style="${gridStyle}">
        ${this.metrics.map(m => this._renderCard(m))}
      </div>
    `;
  }

  private _renderCard(m: MetricDefinition): TemplateResult {
    const statusClass = m.status ? `status-${m.status}` : '';
    const ariaLabel = [m.label, String(m.value), m.unit, m.trend ? `${m.trend.direction} ${m.trend.delta}` : '']
      .filter(Boolean).join(' ');

    return html`
      <div
        class="card ${statusClass}"
        role="listitem"
        tabindex="0"
        aria-label="${ariaLabel}"
        @click=${() => this._handleCardClick(m)}
        @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._handleCardClick(m); } }}
      >
        <div class="value-row">
          <span class="value">${m.value}</span>
          ${m.unit ? html`<span class="unit">${m.unit}</span>` : nothing}
        </div>
        <div class="label">${m.label}</div>
        ${m.trend ? html`
          <span class="trend ${m.trend.direction}">
            ${TREND_ARROWS[m.trend.direction]} ${m.trend.delta}
          </span>
        ` : nothing}
        ${m.sparkline ? renderSparkline(m.sparkline, { width: 48, height: this._sparklineHeight }) : nothing}
      </div>
    `;
  }

  private _handleCardClick(m: MetricDefinition): void {
    this.announce(`Selected ${m.label}: ${m.value} ${m.unit ?? ''}`);
    emitPagesEvent(this, KpiMetricRowTopics.CARD_CLICKED, {
      key: m.key,
      value: m.value,
      label: m.label,
    });
  }

  private async _fetchMetrics(): Promise<void> {
    if (!this.endpoint) return;
    this._loading = true;
    this._error = null;
    try {
      const resp = await fetch(this.endpoint);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      this.metrics = data as MetricDefinition[];
    } catch (e) {
      this._error = `Failed to load metrics: ${(e as Error).message}`;
    } finally {
      this._loading = false;
    }
  }

  async refresh(): Promise<void> {
    await this._fetchMetrics();
  }

  configure(props: {
    metrics?: MetricDefinition[];
    endpoint?: string | null;
    columns?: number | null;
    refreshInterval?: number | null;
  }): void {
    if (props.metrics !== undefined) this.metrics = props.metrics;
    if (props.endpoint !== undefined) this.endpoint = props.endpoint;
    if (props.columns !== undefined) this.columns = props.columns;
    if (props.refreshInterval !== undefined) this.refreshInterval = props.refreshInterval;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'blocks-kpi-metric-row': KpiMetricRow;
  }
}
