import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { PagesConfirmDialog } from '@casehubio/pages-ui-components';
import '@casehubio/pages-table';
import type { ColumnRenderer } from '@casehubio/pages-table';
import { fromRows } from '@casehubio/pages-data/dist/dataset/conversion.js';
import { columnId, ColumnType } from '@casehubio/pages-data/dist/dataset/types.js';
import type { CellValue, ColumnId, TypedRow } from '@casehubio/pages-data/dist/dataset/types.js';
import type { ImprovementStreamView } from './types.js';
import { EvolutionApi } from './api.js';
import { emitEvolutionEvent, EvolutionEventTopics } from './events.js';
import { emitPagesEvent } from '@casehubio/pages-data';

const AGENT_SELECTED_TOPIC = 'evolution:agent-selected';

const ID_COL = columnId('improvementCaseId');
const CATEGORY_COL = columnId('category');
const TARGET_COL = columnId('target');
const STAGE_COL = columnId('currentStage');
const BLOCKED_COL = columnId('blockedBy');
const CONFLICT_COL = columnId('conflictBlocked');
const STARTED_COL = columnId('startedAt');
const ACTIONS_COL = columnId('actions');

const COL_DEFS = [
  { id: ID_COL, type: ColumnType.TEXT, getValue: (s: ImprovementStreamView) => s.improvementCaseId },
  { id: CATEGORY_COL, name: 'Category', type: ColumnType.TEXT, getValue: (s: ImprovementStreamView) => s.category },
  { id: TARGET_COL, name: 'Target', type: ColumnType.TEXT, getValue: (s: ImprovementStreamView) => s.target ?? '' },
  { id: STAGE_COL, name: 'Stage', type: ColumnType.TEXT, getValue: (s: ImprovementStreamView) => s.currentStage },
  { id: BLOCKED_COL, name: 'Blocked', type: ColumnType.TEXT, getValue: (s: ImprovementStreamView) => s.blockedBy ?? '' },
  { id: CONFLICT_COL, name: 'Conflict', type: ColumnType.TEXT, getValue: (s: ImprovementStreamView) => s.conflictBlocked ? 'Yes' : '' },
  { id: STARTED_COL, name: 'Started', type: ColumnType.TEXT, getValue: (s: ImprovementStreamView) => s.startedAt },
  { id: ACTIONS_COL, type: ColumnType.TEXT, getValue: () => '' },
] as const;

const COL_CONFIG = [
  { id: ID_COL, visible: false },
  { id: CATEGORY_COL, sortable: true, width: '120px' },
  { id: TARGET_COL, sortable: true, width: '1fr' },
  { id: STAGE_COL, sortable: true, width: '140px' },
  { id: BLOCKED_COL, sortable: false, width: '100px' },
  { id: CONFLICT_COL, sortable: false, width: '80px' },
  { id: STARTED_COL, sortable: true, width: '140px' },
  { id: ACTIONS_COL, sortable: false, width: '100px' },
];

export interface EvolutionStreamsProps {
  endpoint?: string;
  caseId?: string;
  tenancyId?: string;
  streams?: readonly ImprovementStreamView[];
  readonly?: boolean;
}

@customElement('blocks-evolution-streams')
export class EvolutionStreams extends LitElement {
  @property({ type: String }) endpoint?: string;
  @property({ type: String }) caseId?: string;
  @property({ type: String }) tenancyId?: string;
  @property({ type: Array, attribute: false }) streams?: readonly ImprovementStreamView[];
  @property({ type: Boolean }) readonly = false;

  @state() private _loading = false;
  @state() private _error: string | null = null;
  @state() private _fetched: ImprovementStreamView[] | null = null;
  @state() private _showBlockDialog = false;
  @state() private _pendingBlockId: string | null = null;
  @state() private _blockByValue = '';

  private _api?: EvolutionApi;

  private get _data(): readonly ImprovementStreamView[] {
    return this.streams ?? this._fetched ?? [];
  }

  private _columnRenderers: ReadonlyMap<ColumnId, ColumnRenderer> = new Map<ColumnId, ColumnRenderer>([
    [CATEGORY_COL, (cell: CellValue) => {
      const val = cell.type === 'NULL' ? '' : (cell as { value: string }).value;
      return html`<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:12px;font-weight:500;background:var(--pages-accent-3,#dbeafe);color:var(--pages-accent-11,#1e40af)">${val}</span>`;
    }],
    [TARGET_COL, (cell: CellValue) => {
      const val = cell.type === 'NULL' ? '' : (cell as { value: string }).value;
      if (!val) return html`<span style="color:var(--pages-neutral-7,#737373);font-style:italic">—</span>`;
      return html`<code style="font-family:var(--pages-font-mono,monospace);font-size:13px">${val}</code>`;
    }],
    [BLOCKED_COL, (cell: CellValue) => {
      const val = cell.type === 'NULL' ? '' : (cell as { value: string }).value;
      if (!val) return nothing;
      return html`<span style="display:inline-flex;align-items:center;gap:4px;color:var(--pages-warning-11,#92400e);font-size:12px">⊜ Blocked</span>`;
    }],
    [CONFLICT_COL, (cell: CellValue) => {
      const val = cell.type === 'NULL' ? '' : (cell as { value: string }).value;
      if (!val) return nothing;
      return html`<span style="display:inline-block;padding:2px 6px;border-radius:10px;font-size:11px;background:var(--pages-warning-3,#fef3c7);color:var(--pages-warning-11,#92400e)">Conflict</span>`;
    }],
    [STARTED_COL, (cell: CellValue) => {
      if (cell.type === 'NULL' || !(cell as { value: string }).value) return '';
      const d = new Date((cell as { value: string }).value);
      return html`<span style="font-size:12px;color:var(--pages-neutral-9,#737373)">${d.toLocaleString()}</span>`;
    }],
    [ACTIONS_COL, (_cell: CellValue, row: TypedRow) => {
      if (this.readonly) return nothing;
      const blocked = row.text(BLOCKED_COL);
      const id = row.text(ID_COL);
      if (blocked) {
        return html`<button style="padding:4px 10px;border:none;border-radius:4px;font-size:12px;font-weight:500;cursor:pointer;background:var(--pages-success-3,#dcfce7);color:var(--pages-success-11,#166534)" aria-label="Unblock ${id}" @click=${(e: Event) => { e.stopPropagation(); this._handleUnblock(id); }}>Unblock</button>`;
      }
      return html`<button style="padding:4px 10px;border:none;border-radius:4px;font-size:12px;font-weight:500;cursor:pointer;background:var(--pages-warning-3,#fef3c7);color:var(--pages-warning-11,#92400e)" aria-label="Block ${id}" @click=${(e: Event) => { e.stopPropagation(); this._handleBlock(id); }}>Block</button>`;
    }],
  ]);

  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, system-ui); }
    .empty { padding: 24px; text-align: center; color: var(--pages-neutral-9, #737373); }
    .loading { padding: 24px; text-align: center; color: var(--pages-neutral-9, #737373); }
    .error { padding: 16px; background: var(--pages-danger-3, #fee); color: var(--pages-danger-11, #c00); border-radius: 4px; }
    .block-form label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 4px; }
    .block-form input {
      width: 100%; padding: 8px; border: 1px solid var(--pages-neutral-6, #e0e0e0);
      border-radius: 4px; font-size: 13px; box-sizing: border-box;
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Improvement streams');
    if (this.endpoint && !this._api) {
      this._api = new EvolutionApi(this.endpoint);
    }
    if (this._api && this.caseId && this.tenancyId && !this.streams) {
      this._fetch();
    }
  }

  configure(props: Partial<EvolutionStreamsProps>): void {
    if (props.endpoint !== undefined) this.endpoint = props.endpoint;
    if (props.caseId !== undefined) this.caseId = props.caseId;
    if (props.tenancyId !== undefined) this.tenancyId = props.tenancyId;
    if (props.streams !== undefined) this.streams = props.streams;
    if (props.readonly !== undefined) this.readonly = props.readonly;
  }

  private async _fetch(): Promise<void> {
    if (!this._api || !this.caseId || !this.tenancyId) return;
    this._loading = true;
    this._error = null;
    try {
      this._fetched = await this._api.getStreamProgress(this.caseId, this.tenancyId);
    } catch (e) {
      this._error = e instanceof Error ? e.message : 'Failed to load streams';
    } finally {
      this._loading = false;
    }
  }

  private _handleBlock(improvementId: string): void {
    this._pendingBlockId = improvementId;
    this._blockByValue = '';
    this._showBlockDialog = true;
  }

  private async _confirmBlock(): Promise<void> {
    const improvementId = this._pendingBlockId;
    const blockedBy = this._blockByValue.trim();
    if (!improvementId || !blockedBy) return;
    this._showBlockDialog = false;
    this._pendingBlockId = null;
    if (!this._api || !this.caseId || !this.tenancyId) return;
    try {
      await this._api.blockImprovement(this.caseId, this.tenancyId, improvementId, blockedBy);
      emitEvolutionEvent(this, EvolutionEventTopics.STREAM_CHANGED, { action: 'block' as const, improvementId });
      await this._fetch();
    } catch (e) {
      this._error = e instanceof Error ? e.message : 'Failed to block improvement';
    }
  }

  private async _handleUnblock(improvementId: string): Promise<void> {
    if (!this._api || !this.caseId || !this.tenancyId) return;
    try {
      await this._api.unblockImprovement(this.caseId, this.tenancyId, improvementId);
      emitEvolutionEvent(this, EvolutionEventTopics.STREAM_CHANGED, { action: 'unblock' as const, improvementId });
      await this._fetch();
    } catch (e) {
      this._error = e instanceof Error ? e.message : 'Failed to unblock improvement';
    }
  }

  private _handleRowActivated(e: CustomEvent): void {
    const row = e.detail?.row as TypedRow | undefined;
    if (!row) return;
    const improvementCaseId = row.text(ID_COL);
    emitPagesEvent(this, AGENT_SELECTED_TOPIC, { improvementCaseId });
  }

  override render() {
    this.setAttribute('aria-busy', String(this._loading));
    if (this._loading) return html`<div class="loading">Loading streams...</div>`;
    if (this._error) return html`<div class="error">${this._error}</div>`;
    const data = this._data;
    if (data.length === 0) return html`<div class="empty">No active improvement streams.</div>`;

    return html`
      <pages-table
        .dataSet=${fromRows([...data], COL_DEFS)}
        .columnConfig=${COL_CONFIG}
        .columnRenderers=${this._columnRenderers}
        .getRowKey=${(row: TypedRow) => row.text(ID_COL)}
        mode="scroll"
        selection="single"
        @row-activated=${(e: CustomEvent) => this._handleRowActivated(e)}
      ></pages-table>

      <pages-confirm-dialog
        .open=${this._showBlockDialog}
        heading="Block improvement?"
        confirmLabel="Block"
        cancelLabel="Cancel"
        confirmVariant="danger"
        @confirm=${() => this._confirmBlock()}
        @cancel=${() => { this._showBlockDialog = false; this._pendingBlockId = null; }}
      >
        <div class="block-form">
          <label>Blocking improvement ID</label>
          <input type="text" .value=${this._blockByValue}
                 @input=${(e: Event) => { this._blockByValue = (e.target as HTMLInputElement).value; }} />
        </div>
      </pages-confirm-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'blocks-evolution-streams': EvolutionStreams;
  }
}
