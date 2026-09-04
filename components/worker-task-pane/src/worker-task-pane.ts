import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { KeyboardShortcutMixin, LiveRegionMixin } from '@casehubio/pages-primitives';
import { emitPagesEvent, onPagesEvent } from '@casehubio/pages-data';
import { fromRows } from '@casehubio/pages-data/dist/dataset/conversion.js';
import { columnId, ColumnType } from '@casehubio/pages-data/dist/dataset/types.js';
import type { TypedDataSet, TypedRow, ColumnId as ColId } from '@casehubio/pages-data/dist/dataset/types.js';
import type { TableColumnConfig, ColumnRenderer } from '@casehubio/pages-table';
import type { TabDefinition } from '@casehubio/blocks-ui-detail-pane';
import type { WorkIdentity } from '@casehubio/blocks-ui-core';
import '@casehubio/pages-ui-components';
import '@casehubio/blocks-ui-list-pane';
import '@casehubio/blocks-ui-detail-pane';
import type {
  WorkerTaskResponse,
  WorkerTaskSubmission,
  WorkerTaskClaimRequest,
  WorkerTaskContext,
  WorkspaceDefinition,
  WorkspaceResultEvent,
} from './types.js';
import { WorkerTaskEventTopics } from './types.js';

const TASK_ID_COL = columnId('taskId');
const CASE_ID_COL = columnId('caseId');
const CAPABILITY_COL = columnId('capabilityTag');
const DISPATCHED_COL = columnId('dispatchedAt');

const DEFAULT_COL_DEFS = [
  { id: TASK_ID_COL, type: ColumnType.TEXT, getValue: (row: WorkerTaskResponse) => row.taskId },
  { id: CASE_ID_COL, name: 'Case', type: ColumnType.TEXT, getValue: (row: WorkerTaskResponse) => row.caseId },
  { id: CAPABILITY_COL, name: 'Capability', type: ColumnType.TEXT, getValue: (row: WorkerTaskResponse) => row.capabilityTag },
  { id: DISPATCHED_COL, name: 'Dispatched', type: ColumnType.DATE, getValue: (row: WorkerTaskResponse) => row.dispatchedAt },
] as const;

const DEFAULT_COL_CONFIG: readonly TableColumnConfig[] = [
  { id: TASK_ID_COL, visible: false },
  { id: CASE_ID_COL, sortable: true, width: '1fr' },
  { id: CAPABILITY_COL, sortable: true, width: '1fr' },
  { id: DISPATCHED_COL, sortable: true, width: '1fr' },
];

const WorkerTaskPaneBase = LiveRegionMixin(KeyboardShortcutMixin(LitElement));

@customElement('blocks-worker-task-pane')
export class BlocksWorkerTaskPane extends WorkerTaskPaneBase {
  @property() layout: 'split' | 'stacked' = 'split';
  @property() endpoint = '';
  @property({ attribute: false }) data?: WorkerTaskResponse[];
  @property({ attribute: 'selection-topic' }) selectionTopic = 'worker-task';
  @property({ attribute: false }) identity: WorkIdentity = { userId: '', displayName: '', groups: [] };
  @property({ attribute: false }) columnConfig?: TableColumnConfig[];
  @property({ attribute: false }) columnRenderers?: ReadonlyMap<ColId, ColumnRenderer>;
  @property({ attribute: false }) getRowKey?: (row: TypedRow) => string;
  @property({ attribute: false }) contextTabs: TabDefinition[] = [];
  @property({ attribute: false }) workspaces: WorkspaceDefinition[] = [];
  @property({ attribute: 'respond-endpoint' }) respondEndpoint = '';
  @property({ attribute: false }) declineReasons: string[] = ['Out of clearance', 'Insufficient data', 'Conflict of interest'];
  @property({ attribute: 'claim-endpoint' }) claimEndpoint = '';
  @property({ attribute: 'event-stream-endpoint' }) eventStreamEndpoint = '';
  @property({ type: Boolean, attribute: 'show-context' }) showContext = true;
  @property({ type: Boolean, attribute: 'show-workspace' }) showWorkspace = true;

  @state() private _items: WorkerTaskResponse[] = [];
  @state() private _selectedItem: WorkerTaskResponse | null = null;
  @state() private _tableDataSet: TypedDataSet | undefined;
  @state() private _loading = false;
  @state() private _error: string | null = null;
  @state() private _claimed = false;
  @state() private _workspaceResult: WorkspaceResultEvent['detail'] | null = null;
  @state() private _submitting = false;
  @state() private _submitError: string | null = null;
  @state() private _showDeclineForm = false;

  private _workspaceElements = new Map<string, HTMLElement>();
  private _unsubscribeSelection?: () => void;

  static override styles = css`
    :host { display: flex; flex-direction: column; height: 100%; box-sizing: border-box; }
    .stacked-layout { display: flex; flex-direction: column; height: 100%; gap: 8px; overflow-y: auto; }
    .detail-column { display: flex; flex-direction: column; gap: 8px; overflow-y: auto; padding: 8px; }
    .section { border: 1px solid var(--pages-neutral-5, #e0e0e0); border-radius: 6px; overflow: hidden; }
    .workspace-container { min-height: var(--worker-task-workspace-min-height, 200px); }
    .context-container { min-height: var(--worker-task-context-min-height, 120px); }
    .response-container { min-height: var(--worker-task-response-min-height, auto); }
    .empty-detail { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--pages-neutral-9, #888); font-size: 14px; }
    .error-banner { padding: 8px 12px; background: var(--pages-error-3, #fee); color: var(--pages-error-11, #c00); border-radius: 4px; font-size: 13px; margin-top: 8px; }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Worker task pane');
    this._unsubscribeSelection = onPagesEvent(document, `${this.selectionTopic}:selected`, (payload: any) => {
      this._handleSelection(payload);
    });
    if (this.endpoint && !this.data) {
      this._fetchItems();
    }
    this.registerShortcut('c', () => { if (this._selectedItem && !this._claimed && this.claimEndpoint) this._handleClaim(); }, { description: 'Claim task' });
    this.registerShortcut('d', () => { if (this._selectedItem && this._claimed) this._showDeclineForm = true; }, { description: 'Decline task' });
    this.registerShortcut('Escape', () => {
      if (this._showDeclineForm) { this._showDeclineForm = false; }
      else if (this._selectedItem) { this._selectedItem = null; emitPagesEvent(document, `${this.selectionTopic}:deselected`, {}); }
    }, { description: 'Close / Deselect' });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribeSelection?.();
  }

  override willUpdate(changed: Map<string, unknown>): void {
    super.willUpdate(changed);
    if (changed.has('data') && this.data) {
      this._items = this.data;
      this._rebuildDataSet();
    }
    if (changed.has('endpoint') && this.endpoint && !this.data) {
      this._fetchItems();
    }
  }

  configure(props: Partial<Record<string, unknown>>): void {
    Object.assign(this, props);
  }

  private async _fetchItems(): Promise<void> {
    this._loading = true;
    this._error = null;
    try {
      const resp = await fetch(this.endpoint);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      this._items = await resp.json();
      this._rebuildDataSet();
    } catch (e: any) {
      this._error = e.message ?? 'Failed to load tasks';
      this.announce('Failed to load tasks');
    } finally {
      this._loading = false;
    }
  }

  private _rebuildDataSet(): void {
    const filtered = this._filterByIdentity(this._items);
    this._tableDataSet = filtered.length > 0 ? fromRows(filtered, DEFAULT_COL_DEFS) : undefined;
  }

  private _filterByIdentity(items: WorkerTaskResponse[]): WorkerTaskResponse[] {
    if (!this.identity.groups.length) return items;
    return items.filter(task => {
      if (task.assigneeId && task.assigneeId !== this.identity.userId) return false;
      return this.identity.groups.includes(task.capabilityTag);
    });
  }

  private _handleSelection(payload: any): void {
    const taskId = typeof payload?.text === 'function'
      ? payload.text(TASK_ID_COL)
      : (payload?.taskId ?? payload?.id);
    if (!taskId) return;
    const item = this._items.find(i => i.taskId === taskId);
    if (!item) return;
    this._selectedItem = item;
    this._workspaceResult = null;
    this._submitError = null;
    this._showDeclineForm = false;
    this._claimed = !this.claimEndpoint || item.assigneeId === this.identity.userId;
  }

  private _buildTaskContext(task: WorkerTaskResponse): WorkerTaskContext {
    return {
      taskId: task.taskId,
      capabilityTag: task.capabilityTag,
      caseId: task.caseId,
      commandParams: task.commandParams,
      investigationSummary: task.investigationSummary,
    };
  }

  private _getOrCreateWorkspace(def: WorkspaceDefinition): HTMLElement {
    let element = this._workspaceElements.get(def.capabilityTag);
    if (!element) {
      element = document.createElement(def.tagName);
      element.addEventListener('workspace-result', ((e: CustomEvent) => {
        if (this._selectedItem && e.detail) {
          this._workspaceResult = e.detail;
        }
      }) as EventListener);
      this._workspaceElements.set(def.capabilityTag, element);
    }
    return element;
  }

  private _defaultGetRowKey = (row: TypedRow): string => row.text(TASK_ID_COL);

  private _renderListPane(): TemplateResult {
    return html`
      <blocks-list-pane
        .dataSet=${this._tableDataSet!}
        .columnConfig=${this.columnConfig ?? DEFAULT_COL_CONFIG}
        .columnRenderers=${this.columnRenderers}
        .getRowKey=${this.getRowKey ?? this._defaultGetRowKey}
        selection-topic=${this.selectionTopic}
        empty-message="No tasks available"
        aria-busy=${this._loading ? 'true' : 'false'}
      ></blocks-list-pane>
    `;
  }

  private _renderDetailColumn(): TemplateResult {
    if (!this._selectedItem) {
      return html`<div class="empty-detail">Select a task to view details</div>`;
    }
    return html`
      <div class="detail-column">
        ${this.showContext ? this._renderContextSection() : nothing}
        ${this.showWorkspace ? this._renderWorkspaceSection() : nothing}
        ${this._renderResponseSection()}
      </div>
    `;
  }

  private _renderContextSection(): TemplateResult {
    return html`
      <div class="section context-container">
        <blocks-detail-pane
          .tabs=${this.contextTabs}
          selection-topic=${this.selectionTopic}
        ></blocks-detail-pane>
      </div>
    `;
  }

  private _renderWorkspaceSection(): TemplateResult {
    return html`
      <div class="section workspace-container" role="region" aria-label="Specialist workspace" aria-live="polite">
        ${this._renderWorkspaceElement()}
      </div>
    `;
  }

  private _renderWorkspaceElement(): TemplateResult | typeof nothing {
    if (!this._selectedItem) return nothing;
    const def = this.workspaces.find(w => w.capabilityTag === this._selectedItem!.capabilityTag);
    if (!def) return html`<div class="empty-detail">No workspace registered for ${this._selectedItem.capabilityTag}</div>`;

    const element = this._getOrCreateWorkspace(def);
    (element as any).taskContext = this._buildTaskContext(this._selectedItem);
    return html`${element}`;
  }

  private _renderResponseSection(): TemplateResult {
    if (!this._selectedItem) return html`<div class="section response-container"></div>`;

    return html`
      <div class="section response-container" role="form" aria-label="Task response">
        ${!this._claimed ? this._renderClaimButton() : this._renderResponseForm()}
        ${this._submitError ? html`<div role="alert" class="error-banner">${this._submitError}</div>` : nothing}
      </div>
    `;
  }

  private _renderClaimButton(): TemplateResult {
    return html`
      <div style="padding: 12px; text-align: center;">
        <button data-action="claim"
          @click=${this._handleClaim}
          ?disabled=${this._submitting}
          aria-disabled=${this._submitting ? 'true' : 'false'}>
          Claim Task
        </button>
      </div>
    `;
  }

  private _renderResponseForm(): TemplateResult {
    const hasResult = !!this._workspaceResult;
    return html`
      <div style="padding: 12px; display: flex; gap: 8px; align-items: flex-start; flex-wrap: wrap;">
        <button data-action="submit"
          @click=${this._handleSubmit}
          ?disabled=${!hasResult || this._submitting}
          aria-disabled=${!hasResult || this._submitting ? 'true' : 'false'}>
          Submit${this._workspaceResult ? html` (${(this._workspaceResult.confidence * 100).toFixed(0)}%)` : nothing}
        </button>
        <button data-action="decline" @click=${() => { this._showDeclineForm = true; }}>
          Decline
        </button>
        ${this._showDeclineForm ? this._renderDeclineForm() : nothing}
      </div>
    `;
  }

  private _renderDeclineForm(): TemplateResult {
    return html`
      <div style="width: 100%; margin-top: 8px; display: flex; flex-direction: column; gap: 8px;">
        <select data-field="decline-reason" aria-label="Decline reason">
          <option value="">Select reason...</option>
          ${this.declineReasons.map(r => html`<option value=${r}>${r}</option>`)}
        </select>
        <textarea data-field="decline-detail" aria-label="Decline detail"
          placeholder="Additional details (optional)" rows="2"
          style="resize: vertical; font-family: inherit; font-size: 13px;"></textarea>
        <button data-action="confirm-decline" @click=${this._handleDecline}>
          Confirm Decline
        </button>
      </div>
    `;
  }

  private async _handleClaim(): Promise<void> {
    if (!this._selectedItem) return;
    this._submitting = true;
    this._submitError = null;

    const detail: WorkerTaskClaimRequest = { taskId: this._selectedItem.taskId };
    const event = new CustomEvent(WorkerTaskEventTopics.CLAIMED, { detail, cancelable: true });
    this.dispatchEvent(event);

    if (!event.defaultPrevented && this.claimEndpoint) {
      try {
        const resp = await fetch(`${this.claimEndpoint}/${this._selectedItem.taskId}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(detail),
        });
        if (!resp.ok) throw new Error(`Claim failed: HTTP ${resp.status}`);
      } catch (e: any) {
        this._submitError = e.message;
        this._submitting = false;
        this.announce('Claim failed');
        return;
      }
    }

    this._claimed = true;
    this._submitting = false;
    this.announce('Task claimed');
  }

  private async _handleSubmit(): Promise<void> {
    if (!this._selectedItem || !this._workspaceResult) return;
    this._submitting = true;
    this._submitError = null;

    const submission: WorkerTaskSubmission = {
      type: 'RESPONSE',
      taskId: this._selectedItem.taskId,
      result: this._workspaceResult,
    };

    const event = new CustomEvent(WorkerTaskEventTopics.RESPONDED, { detail: submission, cancelable: true });
    this.dispatchEvent(event);

    if (!event.defaultPrevented && this.respondEndpoint) {
      try {
        const resp = await fetch(`${this.respondEndpoint}/${this._selectedItem.taskId}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(submission),
        });
        if (!resp.ok) throw new Error(`Submit failed: HTTP ${resp.status}`);
      } catch (e: any) {
        this._submitError = e.message;
        this._submitting = false;
        this.announce('Submission failed');
        return;
      }
    }

    this._items = this._items.filter(i => i.taskId !== this._selectedItem!.taskId);
    this._rebuildDataSet();
    this._selectedItem = null;
    this._workspaceResult = null;
    this._submitting = false;
    this.announce('Response submitted');
  }

  private async _handleDecline(): Promise<void> {
    if (!this._selectedItem) return;
    const reason = (this.shadowRoot!.querySelector('[data-field="decline-reason"]') as HTMLSelectElement)?.value || '';
    const detailText = (this.shadowRoot!.querySelector('[data-field="decline-detail"]') as HTMLTextAreaElement)?.value || '';

    const submission: WorkerTaskSubmission = {
      type: 'DECLINE',
      taskId: this._selectedItem.taskId,
      declineReason: reason,
      declineDetail: detailText,
    };

    const event = new CustomEvent(WorkerTaskEventTopics.DECLINED, { detail: submission, cancelable: true });
    this.dispatchEvent(event);

    if (!event.defaultPrevented && this.respondEndpoint) {
      try {
        const resp = await fetch(`${this.respondEndpoint}/${this._selectedItem.taskId}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(submission),
        });
        if (!resp.ok) throw new Error(`Decline failed: HTTP ${resp.status}`);
      } catch (e: any) {
        this._submitError = e.message;
        this.announce('Decline failed');
        return;
      }
    }

    this._items = this._items.filter(i => i.taskId !== this._selectedItem!.taskId);
    this._rebuildDataSet();
    this._selectedItem = null;
    this._showDeclineForm = false;
    this.announce('Task declined');
  }

  override render(): TemplateResult {
    if (this.layout === 'stacked') {
      return html`
        <div class="stacked-layout">
          ${this._renderListPane()}
          ${this._renderDetailColumn()}
        </div>
      `;
    }
    return html`
      <pages-split-workbench selection-topic=${this.selectionTopic}>
        <div slot="list">${this._renderListPane()}</div>
        <div slot="detail">${this._renderDetailColumn()}</div>
      </pages-split-workbench>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'blocks-worker-task-pane': BlocksWorkerTaskPane;
  }
}
