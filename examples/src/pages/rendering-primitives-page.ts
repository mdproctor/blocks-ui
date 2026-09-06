import { LitElement, html, css, type TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import {
  formatTimestamp,
  statusBorderColour,
  entryCardStyles,
  badgeStyles,
  roundDividerStyles,
  selectedHighlightStyles,
} from '../../../packages/blocks-ui-core/src/rendering/index.js';
import type { EntryCategory } from '../../../packages/blocks-ui-core/src/rendering/status-colours.js';

const CATEGORIES: EntryCategory[] = ['neutral', 'success', 'warning', 'error', 'accent'];

const SAMPLE_ENTRIES = [
  { agent: 'Alice Chen', type: 'RAISE', content: 'Initial flag — transaction pattern matches known structuring profile across three accounts.', category: 'neutral' as EntryCategory, timestamp: new Date(Date.now() - 5 * 60_000).toISOString() },
  { agent: 'CaseBot', type: 'AGREE', content: 'Confirmed — pattern matches database entry CTR-2024-0891. Recommend escalation.', category: 'success' as EntryCategory, timestamp: new Date(Date.now() - 3 * 60_000).toISOString() },
  { agent: 'Bob Martinez', type: 'COUNTER', content: 'The third transaction looks like a false positive. Same-day payroll deposit from verified employer.', category: 'warning' as EntryCategory, timestamp: new Date(Date.now() - 90_000).toISOString() },
  { agent: 'ReviewBot', type: 'DISPUTE', content: 'Payroll hypothesis inconsistent with transfer amount ($9,500 × 3). Employer payroll is $4,200 bi-weekly.', category: 'error' as EntryCategory, timestamp: new Date(Date.now() - 30_000).toISOString() },
  { agent: 'Alice Chen', type: 'QUALIFY', content: 'Partial agreement — the third deposit may be payroll but the first two are suspicious. Proceeding with SAR for deposits 1 and 2.', category: 'accent' as EntryCategory, timestamp: new Date(Date.now() - 10_000).toISOString() },
];

@customElement('blocks-example-rendering-primitives')
export class RenderingPrimitivesPage extends LitElement {
  @state() private _selectedIndex = -1;
  @state() private _timestampStyle: 'conversational' | 'compact' = 'conversational';

  static override styles = [
    entryCardStyles,
    badgeStyles,
    roundDividerStyles,
    selectedHighlightStyles,
    css`
      :host { display: flex; flex-direction: column; padding: 24px; height: 100%; box-sizing: border-box; overflow-y: auto; }
      h2 { margin: 0 0 16px; font-size: 20px; font-weight: 600; color: var(--pages-neutral-12, #111); }
      h3 { margin: 16px 0 8px; font-size: 15px; font-weight: 600; color: var(--pages-neutral-11, #333); border-bottom: 1px solid var(--pages-neutral-4, #d4d4d4); padding-bottom: 4px; }
      .section { margin-bottom: 24px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
      .colour-row { display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-radius: 4px; background: var(--pages-neutral-1, #fafafa); border: 1px solid var(--pages-neutral-4, #d4d4d4); }
      .colour-swatch { width: 24px; height: 24px; border-radius: 3px; flex-shrink: 0; }
      .colour-label { font-size: 13px; color: var(--pages-neutral-12, #111); font-weight: 500; }
      .colour-value { font-size: 11px; color: var(--pages-neutral-9, #888); font-family: monospace; }
      .timestamp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .timestamp-row { display: flex; justify-content: space-between; padding: 6px 10px; background: var(--pages-neutral-1, #fafafa); border: 1px solid var(--pages-neutral-4, #d4d4d4); border-radius: 4px; font-size: 13px; }
      .timestamp-input { color: var(--pages-neutral-9, #888); font-family: monospace; font-size: 11px; }
      .timestamp-output { font-weight: 600; color: var(--pages-neutral-12, #111); }
      .controls { display: flex; gap: 8px; margin-bottom: 8px; }
      .controls button { padding: 4px 12px; border: 1px solid var(--pages-neutral-6, #555); border-radius: 4px; background: var(--pages-neutral-3, #333); color: var(--pages-neutral-12, #e5e5e5); font-size: 12px; cursor: pointer; }
      .controls button.active { background: var(--pages-accent-9, #6366f1); border-color: var(--pages-accent-9, #6366f1); }
      .point-item { padding: 8px 12px; border: 1px solid var(--pages-neutral-4, #d4d4d4); border-radius: 4px; cursor: pointer; margin-bottom: 4px; font-size: 13px; color: var(--pages-neutral-12, #e5e5e5); }
      .entry-cards { display: flex; flex-direction: column; gap: 8px; }
    `,
  ];

  override render(): TemplateResult {
    return html`
      <h2>Shared Rendering Primitives</h2>
      <p style="color: var(--pages-neutral-9, #888); font-size: 13px; margin: 0 0 16px;">
        Extracted from debate-feed, conversation-viewer, and review-tracker into <code>blocks-ui-core/rendering/</code>.
      </p>

      ${this._renderEntryCards()}
      ${this._renderBadges()}
      ${this._renderTimestamps()}
      ${this._renderStatusColours()}
      ${this._renderRoundDividers()}
      ${this._renderSelectedHighlight()}
    `;
  }

  private _renderEntryCards(): TemplateResult {
    return html`
      <div class="section">
        <h3>Entry Card Styles</h3>
        <div class="entry-cards">
          ${SAMPLE_ENTRIES.map(e => html`
            <div class="entry-card" style="border-left-color: ${statusBorderColour(e.category)}">
              <div class="entry-header">
                <span class="entry-agent">${e.agent}</span>
                <span class="entry-type">${e.type}</span>
                <span class="entry-timestamp">${formatTimestamp(e.timestamp)}</span>
              </div>
              <div class="entry-content">${e.content}</div>
            </div>
          `)}
        </div>
      </div>
    `;
  }

  private _renderBadges(): TemplateResult {
    return html`
      <div class="section">
        <h3>Badge Styles</h3>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
          <span class="badge badge-priority">Low Priority</span>
          <span class="badge badge-priority-medium">Medium</span>
          <span class="badge badge-priority-high">High</span>
          <span class="badge badge-scope">AML</span>
          <span class="badge badge-scope">Compliance</span>
          <span class="badge badge-location">src/main/java</span>
          <span class="badge badge-location">line 42</span>
        </div>
      </div>
    `;
  }

  private _renderTimestamps(): TemplateResult {
    const now = Date.now();
    const samples = [
      { label: '30 seconds ago', iso: new Date(now - 30_000).toISOString() },
      { label: '5 minutes ago', iso: new Date(now - 5 * 60_000).toISOString() },
      { label: '3 hours ago', iso: new Date(now - 3 * 3_600_000).toISOString() },
      { label: '2 days ago', iso: new Date(now - 2 * 86_400_000).toISOString() },
      { label: '30 days ago', iso: new Date(now - 30 * 86_400_000).toISOString() },
    ];

    return html`
      <div class="section">
        <h3>formatTimestamp</h3>
        <div class="controls">
          <button class=${this._timestampStyle === 'conversational' ? 'active' : ''} @click=${() => { this._timestampStyle = 'conversational'; }}>Conversational</button>
          <button class=${this._timestampStyle === 'compact' ? 'active' : ''} @click=${() => { this._timestampStyle = 'compact'; }}>Compact</button>
        </div>
        <div class="timestamp-grid">
          ${samples.map(s => html`
            <div class="timestamp-row">
              <span class="timestamp-input">${s.label}</span>
              <span class="timestamp-output">${formatTimestamp(s.iso, { style: this._timestampStyle })}</span>
            </div>
          `)}
        </div>
      </div>
    `;
  }

  private _renderStatusColours(): TemplateResult {
    return html`
      <div class="section">
        <h3>Status Border Colours</h3>
        <div class="grid">
          ${CATEGORIES.map(cat => html`
            <div class="colour-row">
              <div class="colour-swatch" style="background: ${statusBorderColour(cat)}"></div>
              <div>
                <div class="colour-label">${cat}</div>
                <div class="colour-value">${statusBorderColour(cat)}</div>
              </div>
            </div>
          `)}
        </div>
      </div>
    `;
  }

  private _renderRoundDividers(): TemplateResult {
    return html`
      <div class="section">
        <h3>Round Dividers</h3>
        <div class="round-divider">Round 1</div>
        <div style="padding: 8px 10px; font-size: 13px; color: var(--pages-neutral-12, #e5e5e5);">Content for round 1 would appear here...</div>
        <div class="round-divider">Round 2</div>
        <div style="padding: 8px 10px; font-size: 13px; color: var(--pages-neutral-12, #e5e5e5);">Content for round 2 would appear here...</div>
        <div class="round-divider">Round 3</div>
        <div style="padding: 8px 10px; font-size: 13px; color: var(--pages-neutral-12, #e5e5e5);">Content for round 3 would appear here...</div>
      </div>
    `;
  }

  private _renderSelectedHighlight(): TemplateResult {
    return html`
      <div class="section">
        <h3>Selected Item Highlight</h3>
        <p style="font-size: 12px; color: var(--pages-neutral-9, #888); margin: 0 0 8px;">Click an item to see the selection highlight.</p>
        ${['Finding: Transaction pattern detected', 'Finding: KYC document mismatch', 'Finding: PEP screening flag'].map((text, i) => html`
          <div class="point-item ${this._selectedIndex === i ? 'selected' : ''}" @click=${() => { this._selectedIndex = i; }}>
            ${text}
          </div>
        `)}
      </div>
    `;
  }
}
