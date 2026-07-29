import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { COMMITMENT_STATES, type CommitmentState, type CommitmentRecord } from '@casehubio/blocks-ui-core';
import '@casehubio/blocks-ui-core';
import '../../../components/commitment-viz/src/commitment-transition-badge.js';
import '../../../components/commitment-viz/src/commitment-range-bar.js';
import { decorateCommitmentRanges } from '../../../components/commitment-viz/src/range-decorator.js';
import type { TransitionRecord, DecorableMessage } from '../../../components/commitment-viz/src/types.js';
import mockData from '../../mock-data/commitment-viz.json';

const commitments = mockData.commitments as Record<string, CommitmentRecord>;
const transitions = mockData.transitions as TransitionRecord[];
const messages = mockData.messages as DecorableMessage[];

const commitmentMap = new Map<string, CommitmentRecord>(Object.entries(commitments));
const decorations = decorateCommitmentRanges(messages, commitmentMap);
const decoratedIds = new Set(decorations.flatMap(d => d.messageIds));

@customElement('blocks-example-commitment-viz')
export class CommitmentVizPage extends LitElement {
  static override styles = css`
    :host { display: block; padding: 24px; }
    h2 { font-size: 20px; font-weight: 600; color: var(--pages-neutral-12, #111); margin-bottom: 8px; }
    h3 { font-size: 16px; font-weight: 600; margin: 24px 0 12px; }
    p { color: var(--pages-neutral-11, #555); font-size: 14px; margin-bottom: 16px; }
    .row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .demo-section { margin-bottom: 32px; padding: 16px; border: 1px solid var(--pages-neutral-5, #e0e0e0); border-radius: 6px; background: var(--pages-neutral-1, #fff); }
    .range-row { display: flex; flex-direction: column; gap: 12px; }
    .range-label { font-size: 12px; color: var(--pages-neutral-9, #888); margin-bottom: 4px; }
    .feed-msg {
      padding: 8px 12px;
      font-size: 13px;
      border-left: 3px solid transparent;
      border-bottom: 1px solid var(--pages-neutral-3, #f0f0f0);
    }
    .feed-msg.decorated { border-left-color: var(--pages-accent-9, #2563eb); background: var(--pages-accent-1, #f8faff); }
    .feed-msg-id { font-size: 11px; color: var(--pages-neutral-8, #888); margin-right: 8px; }
  `;

  override render() {
    return html`
      <h2>Commitment Visualization</h2>
      <p>Standalone components for rendering commitment lifecycle state.</p>

      <h3>State Pills — all 7 states (sm + md)</h3>
      <div class="demo-section">
        <div class="row">
          ${(COMMITMENT_STATES as readonly CommitmentState[]).map(s => html`
            <commitment-state-pill .state=${s}></commitment-state-pill>
          `)}
        </div>
        <div class="row">
          ${(COMMITMENT_STATES as readonly CommitmentState[]).map(s => html`
            <commitment-state-pill .state=${s} size="md" .showIcon=${true}></commitment-state-pill>
          `)}
        </div>
      </div>

      <h3>Transition Badges</h3>
      <div class="demo-section">
        ${transitions.map(t => html`
          <div class="row">
            <commitment-transition-badge .transition=${t}></commitment-transition-badge>
          </div>
        `)}
        <h3 style="margin-top:16px">Compact</h3>
        ${transitions.map(t => html`
          <div class="row">
            <commitment-transition-badge .transition=${t} .compact=${true}></commitment-transition-badge>
          </div>
        `)}
      </div>

      <h3>Range Bars — Compact</h3>
      <div class="demo-section">
        <div class="range-row">
          ${Object.entries(commitments).map(([key, c]) => html`
            <div>
              <div class="range-label">${key} (${c.state})</div>
              <commitment-range-bar
                .state=${c.state as CommitmentState}
                .createdAt=${c.createdAt}
                .resolvedAt=${(c as any).resolvedAt}
                .acknowledgedAt=${(c as any).acknowledgedAt}
                .deadline=${(c as any).deadline}
              ></commitment-range-bar>
            </div>
          `)}
        </div>
      </div>

      <h3>Range Bars — Detailed</h3>
      <div class="demo-section">
        <div class="range-row">
          ${Object.entries(commitments).map(([key, c]) => html`
            <div>
              <div class="range-label">${key} (${c.state})</div>
              <commitment-range-bar
                .state=${c.state as CommitmentState}
                .createdAt=${c.createdAt}
                .resolvedAt=${(c as any).resolvedAt}
                .acknowledgedAt=${(c as any).acknowledgedAt}
                .deadline=${(c as any).deadline}
                mode="detailed"
              ></commitment-range-bar>
            </div>
          `)}
        </div>
      </div>

      <h3>Feed Decoration Demo</h3>
      <div class="demo-section">
        <p>${decorations.length} commitment span(s) decorated across ${messages.length} messages</p>
        ${messages.map(m => html`
          <div class="feed-msg ${decoratedIds.has(m.id) ? 'decorated' : ''}">
            <span class="feed-msg-id">${m.id}</span>
            ${(m as any).content ?? ''}
            ${m.correlationId ? html` <commitment-state-pill .state=${commitmentMap.get(m.correlationId)?.state}></commitment-state-pill>` : ''}
          </div>
        `)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'blocks-example-commitment-viz': CommitmentVizPage;
  }
}
