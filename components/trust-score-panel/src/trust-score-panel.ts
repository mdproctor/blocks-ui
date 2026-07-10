import {css, html, LitElement, type PropertyValues} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {DataSourceMixin, renderSparkline, TrendSourceMixin} from '@casehubio/blocks-ui-core';
import {LiveRegionMixin} from '@casehubio/blocks-ui-core/mixins/live-region.js';
import type {TrustLevel, TrustScoreResponse} from './types.js';
import {trustLevelFromScore} from './types.js';
import '@casehubio/blocks-ui-data-table';
import type {ColumnDef} from '@casehubio/blocks-ui-data-table';

const TRUST_LEVEL_COLORS: Record<string, string> = {
  high: 'var(--color-success, #28a745)',
  adequate: 'var(--color-warning, #ffc107)',
  low: 'var(--color-error, #dc3545)',
  none: 'var(--color-neutral, #ccc)',
};

@customElement('trust-score-panel')
export class TrustScorePanel extends TrendSourceMixin(DataSourceMixin(LiveRegionMixin(LitElement))) {
  @property({ type: String, attribute: 'actor-id' }) actorId?: string;
  @property({ type: String }) mode: 'full' | 'compact' = 'full';
  @property({ type: Number }) score?: number;
  @property({ type: String }) trustLevel?: TrustLevel;

  static override styles = css`
    :host {
      display: block;
      font-family: var(--font-family-base, system-ui, sans-serif);
    }

    .trust-score-panel {
      padding: var(--spacing-md, 16px);
    }

    .error-message {
      color: var(--color-error, #c41e3a);
      padding: var(--spacing-md, 16px);
      background: var(--color-error-bg, #fee);
      border-radius: var(--border-radius-sm, 4px);
    }

    .loading-spinner {
      text-align: center;
      padding: var(--spacing-lg, 24px);
      color: var(--color-text-secondary, #666);
    }

    /* Full mode layout */
    .full-mode {
      display: grid;
      gap: var(--spacing-lg, 24px);
    }

    .score-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-sm, 8px);
    }

    .score-gauge {
      width: 200px;
      height: 200px;
    }

    .capability-section {
      margin-top: var(--spacing-md, 16px);
    }

    .capability-section h3 {
      margin: 0 0 var(--spacing-sm, 8px) 0;
      font-size: var(--font-size-lg, 18px);
      font-weight: var(--font-weight-semibold, 600);
    }

    .trend-section {
      margin-top: var(--spacing-md, 16px);
    }

    .trend-section h3 {
      margin: 0 0 var(--spacing-sm, 8px) 0;
      font-size: var(--font-size-lg, 18px);
      font-weight: var(--font-weight-semibold, 600);
    }

    .trend-placeholder {
      padding: var(--spacing-lg, 24px);
      text-align: center;
      background: var(--color-surface-secondary, #f5f5f5);
      border-radius: var(--border-radius-md, 8px);
      color: var(--color-text-secondary, #666);
      font-style: italic;
    }

    /* Compact mode badge */
    .trust-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
      border-radius: var(--border-radius-sm, 4px);
      font-size: var(--font-size-sm, 14px);
      font-weight: var(--font-weight-semibold, 600);
      min-width: 48px;
    }

    .trust-badge.high {
      background: var(--color-success-bg, #d4edda);
      color: var(--color-success-text, #155724);
    }

    .trust-badge.adequate {
      background: var(--color-warning-bg, #fff3cd);
      color: var(--color-warning-text, #856404);
    }

    .trust-badge.low {
      background: var(--color-error-bg, #f8d7da);
      color: var(--color-error-text, #721c24);
    }

    .trust-badge.none {
      background: var(--color-neutral-bg, #e9ecef);
      color: var(--color-text-secondary, #666);
    }

    .score-bar {
      width: 100px;
      height: 8px;
      background: var(--color-neutral-bg, #e9ecef);
      border-radius: var(--border-radius-sm, 4px);
      overflow: hidden;
    }

    .score-bar-fill {
      height: 100%;
      transition: width 0.3s ease;
    }

    .score-bar-fill.high {
      background: var(--color-success, #28a745);
    }

    .score-bar-fill.adequate {
      background: var(--color-warning, #ffc107);
    }

    .score-bar-fill.low {
      background: var(--color-error, #dc3545);
    }
  `;

  override resolveEndpoint(): string | undefined {
    if (this._hasPreFetchedData()) return undefined;
    if (!this.endpoint || !this.actorId) return undefined;
    return `${this.endpoint}/trust/${this.actorId}`;
  }

  override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (changed.has('actorId')) this.syncEndpoint();
  }

  private _hasPreFetchedData(): boolean {
    return this.mode === 'compact' && this.score !== undefined && this.trustLevel !== undefined;
  }

  private get _trustData(): TrustScoreResponse | null {
    return this.dataSet as TrustScoreResponse | null;
  }

  private _getDisplayScore(): number | undefined {
    if (this.score !== undefined) return this.score;
    return this._trustData?.globalScore;
  }

  private _getDisplayTrustLevel(): TrustLevel {
    if (this.trustLevel) return this.trustLevel;
    return trustLevelFromScore(this._trustData?.globalScore);
  }

  private _renderCompactMode() {
    const score = this._getDisplayScore();
    const level = this._getDisplayTrustLevel();
    const label = score !== undefined ? `Trust score ${score.toFixed(2)}, ${level} trust` : 'No trust data';

    return html`
      <div class="trust-badge ${level}" role="img" aria-label=${label}>
        ${score !== undefined ? score.toFixed(2) : '—'}
      </div>
    `;
  }

  private _renderScoreGauge() {
    const score = this._getDisplayScore();
    const level = this._getDisplayTrustLevel();
    const label = score !== undefined
      ? `Trust score ${score.toFixed(2)}, ${level} trust`
      : 'No trust data available';

    if (score === undefined) {
      return html`
        <div class="score-gauge" role="img" aria-label="No trust data available">
          <svg viewBox="0 0 200 200">
            <text x="100" y="110" text-anchor="middle" font-size="24" fill="currentColor">
              No Data
            </text>
          </svg>
        </div>
      `;
    }

    // Simple arc gauge - 270 degrees arc
    const radius = 70;
    const centerX = 100;
    const centerY = 100;
    const startAngle = -225; // Start at bottom left
    const endAngle = startAngle + 270; // 270 degree arc
    const scoreAngle = startAngle + (score * 270); // Map 0-1 to arc

    const polarToCartesian = (angle: number) => {
      const angleInRadians = ((angle - 90) * Math.PI) / 180;
      return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians),
      };
    };

    const startPoint = polarToCartesian(startAngle);
    const endPoint = polarToCartesian(scoreAngle);

    const arcPath = `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${score > 0.5 ? 1 : 0} 1 ${endPoint.x} ${endPoint.y}`;

    const colors = {
      high: '#28a745',
      adequate: '#ffc107',
      low: '#dc3545',
      none: '#ccc',
    };

    return html`
      <div class="score-gauge" role="img" aria-label=${label}>
        <svg viewBox="0 0 200 200">
          <!-- Background arc -->
          <path
            d=${arcPath}
            fill="none"
            stroke="#e9ecef"
            stroke-width="20"
            stroke-linecap="round"
          />
          <!-- Score arc -->
          <path
            d=${arcPath}
            fill="none"
            stroke=${colors[level]}
            stroke-width="20"
            stroke-linecap="round"
          />
          <!-- Score text -->
          <text x="100" y="110" text-anchor="middle" font-size="32" font-weight="600" fill="currentColor">
            ${score.toFixed(2)}
          </text>
        </svg>
      </div>
    `;
  }

  private _renderCapabilityTable() {
    if (!this._trustData) return html``;

    const capabilities = Object.entries(this._trustData.capabilityScores).map(([tag, score]) => ({
      tag,
      score,
    }));

    if (capabilities.length === 0) {
      return html`<p>No capability scores available</p>`;
    }

    const columns: ColumnDef<{ tag: string; score: number }>[] = [
      {
        id: 'tag',
        label: 'Capability',
        getValue: (row) => row.tag,
        sortable: true,
      },
      {
        id: 'score',
        label: 'Score',
        getValue: (row) => row.score,
        sortable: true,
        render: (value) => {
          const numValue = value as number;
          const level = trustLevelFromScore(numValue);
          return html`
            <div class="score-bar">
              <div
                class="score-bar-fill ${level}"
                style="width: ${numValue * 100}%"
              ></div>
            </div>
            <span style="margin-left: 8px">${numValue.toFixed(2)}</span>
          `;
        },
      },
    ];

    return html`
      <pages-data-table
        .columns=${columns}
        .rows=${capabilities}
        @row-click=${this._handleCapabilityClick}
      ></pages-data-table>
    `;
  }

  private _handleCapabilityClick(e: CustomEvent) {
    const { tag, score } = e.detail;
    this.dispatchEvent(
      new CustomEvent('pages-event', {
        bubbles: true,
        composed: true,
        detail: {
          topic: 'trust.capability-selected',
          data: { tag, score, actorId: this.actorId },
        },
      })
    );
  }

  private _renderTrendSection() {
    if (this.trendLoading) {
      return html`<div class="loading-spinner">Loading trend data...</div>`;
    }
    if (this.trendError) {
      return html`<div class="error-message" role="alert">
        Failed to load trend data: ${this.trendError}
      </div>`;
    }
    const points = this.trendPoints;
    if (points.length < 2) {
      return html`<div class="trend-placeholder">
        Trend data requires backend endpoint
      </div>`;
    }
    const scores = points.map(p => p.score);
    const level = this._getDisplayTrustLevel();
    const color = TRUST_LEVEL_COLORS[level];
    const currentScore = this._getDisplayScore();
    const label = `Trust score trend: ${points.length} data points${
      currentScore !== undefined ? `, current ${currentScore.toFixed(2)}` : ''
    }`;
    return html`
      <div role="img" aria-label=${label}>
        ${renderSparkline(scores, { width: 200, height: 48, color, domain: [0, 1] })}
      </div>
    `;
  }

  private _renderFullMode() {
    if (this.loading) {
      return html`<div class="loading-spinner">Loading trust scores...</div>`;
    }

    if (this.error) {
      return html`
        <div class="error-message" role="alert">
          Failed to load trust scores: ${this.error}
        </div>
      `;
    }

    return html`
      <div class="full-mode">
        <section class="score-section">
          ${this._renderScoreGauge()}
        </section>

        <section class="capability-section">
          <h3>Per-Capability Breakdown</h3>
          ${this._renderCapabilityTable()}
        </section>

        <section class="trend-section">
          <h3>Trust Trend</h3>
          ${this._renderTrendSection()}
        </section>
      </div>
    `;
  }

  override render() {
    return html`
      <div class="trust-score-panel">
        ${this.mode === 'compact' ? this._renderCompactMode() : this._renderFullMode()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'trust-score-panel': TrustScorePanel;
  }
}
