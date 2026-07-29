import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '../../../components/blocks-timeline/src/blocks-timeline.js';
import { commitmentLifecycleStrategy } from '../../../components/blocks-timeline/src/strategies/commitment-lifecycle.js';
import type { CommitmentLifecycleData } from '../../../components/blocks-timeline/src/strategies/commitment-lifecycle.js';
import type { StageConfig } from '../../../components/blocks-timeline/src/types.js';
import commitmentData from '../../mock-data/commitments.json';

const DEVTOWN_STAGES: StageConfig[] = [
  { key: 'REQUESTED', label: 'Requested' },
  { key: 'REVIEWING', label: 'Reviewing' },
  { key: 'APPROVED', label: 'Approved', terminal: 'success' },
  { key: 'REJECTED', label: 'Rejected', terminal: 'failure' },
];

@customElement('blocks-example-commitment-lifecycle')
export class CommitmentLifecyclePage extends LitElement {
  @state() private _selectedId = 'commit-001';

  static override styles = css`
    :host { display: block; padding: 24px; }
    h2 { margin-bottom: 8px; font-size: 20px; font-weight: 600; color: var(--pages-neutral-12, #111); }
    p { margin-bottom: 24px; color: var(--pages-neutral-11, #555); font-size: 14px; }
    h3 { margin: 24px 0 12px; font-size: 16px; font-weight: 600; }
    .controls { margin-bottom: 16px; display: flex; gap: 8px; }
    select { padding: 6px 12px; border: 1px solid var(--pages-neutral-6, #ccc); border-radius: 4px; font-size: 13px; }
    .demo-section { margin-bottom: 32px; padding: 16px; border: 1px solid var(--pages-neutral-5, #e0e0e0); border-radius: 6px; background: var(--pages-neutral-1, #fff); }
    .messages { margin-top: 16px; border-top: 1px solid var(--pages-neutral-4, #eee); padding-top: 12px; }
    .message { padding: 8px; margin-bottom: 6px; background: var(--pages-neutral-2, #f8f8f8); border-radius: 4px; font-size: 13px; }
    .message-sender { font-weight: 600; font-size: 12px; }
    .message-content { margin-top: 4px; }
  `;

  private get _commitment(): CommitmentLifecycleData | undefined {
    return (commitmentData.commitments as CommitmentLifecycleData[]).find(c => c.id === this._selectedId);
  }

  override render() {
    const commitment = this._commitment;

    return html`
      <h2>Commitment Lifecycle (Timeline Strategy)</h2>
      <p>Uses commitmentLifecycleStrategy() with blocks-timeline. OPEN → ACKNOWLEDGED → FULFILLED/FAILED/DECLINED/DELEGATED/EXPIRED (7-state model).</p>

      <div class="controls">
        <select @change=${(e: Event) => { this._selectedId = (e.target as HTMLSelectElement).value; }}>
          ${(commitmentData.commitments as CommitmentLifecycleData[]).map(c => html`
            <option value=${c.id} ?selected=${c.id === this._selectedId}>${c.id} (${c.currentStage})</option>
          `)}
        </select>
      </div>

      <h3>Default Stages (7-State Model)</h3>
      <div class="demo-section">
        ${commitment ? html`
          <blocks-timeline
            .strategy=${commitmentLifecycleStrategy()}
            .data=${commitment}
          ></blocks-timeline>
          ${commitment.messages?.length ? html`
            <div class="messages">
              <strong>Channel Messages</strong>
              ${commitment.messages.map(m => html`
                <div class="message">
                  <div class="message-sender">${m.sender} · ${new Date(m.timestamp).toLocaleString()}</div>
                  <div class="message-content">${m.content}</div>
                </div>
              `)}
            </div>
          ` : ''}
        ` : html`<p>Select a commitment</p>`}
      </div>

      <h3>Custom Stages (DevTown Review)</h3>
      <div class="demo-section">
        <blocks-timeline
          .strategy=${commitmentLifecycleStrategy({ stages: DEVTOWN_STAGES })}
          .data=${{ currentStage: 'REVIEWING', stages: [{ key: 'REQUESTED', status: 'completed', actor: 'dev-1', timestamp: '2026-07-14T10:00:00Z' }, { key: 'REVIEWING', status: 'active', actor: 'reviewer-1', timestamp: '2026-07-14T10:30:00Z' }] }}
        ></blocks-timeline>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'commitment-lifecycle-page': CommitmentLifecyclePage;
  }
}
