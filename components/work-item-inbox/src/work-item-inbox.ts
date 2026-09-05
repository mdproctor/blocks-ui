import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type {
  WorkItemResponse,
  WorkItemRootResponse,
  WorkIdentity,
  InboxSummary,
  BulkRequest,
  BulkItemResult,
  WorkItemLifecycleEvent,
  WorkEventType,
  InboxMode,
  QueueScope,
  QueueScopeChangedPayload,
  QueueView,
  WorkItemQueueEvent,
} from '@casehubio/blocks-ui-core';
import { emitPagesEvent, onPagesEvent } from '@casehubio/pages-data';
import { PagesConfirmDialog } from '@casehubio/pages-ui-components';
import {
  WorkItemEventTopics,
  isActiveStatus,
  WorkEventType as WorkEventTypeEnum,
} from '@casehubio/blocks-ui-core';
import { KeyboardShortcutMixin, LiveRegionMixin } from '@casehubio/pages-primitives';
import { EventStream } from '@casehubio/pages-data';
import { PushMixin } from '@casehubio/pages-component';
import '@casehubio/pages-table';
import '@casehubio/pages-ui-components';
import type { TableColumnConfig, ColumnRenderer, SelectionChangeDetail, RowActivateDetail } from '@casehubio/pages-table';
import { fromRows } from '@casehubio/pages-data/dist/dataset/conversion.js';
import { columnId, ColumnType } from '@casehubio/pages-data/dist/dataset/types.js';
import type { CellValue, ColumnId, TypedRow } from '@casehubio/pages-data/dist/dataset/types.js';
import './inbox-summary-bar.js';
import './inbox-filter-bar.js';
import './queue-pill-bar.js';
import './scope-context-bar.js';
import type { FilterClickDetail } from './inbox-summary-bar.js';
import type { FilterChangeDetail } from './inbox-filter-bar.js';

const ITEM_ID_COL = columnId('id');
const TITLE_COL = columnId('title');
const STATUS_COL = columnId('status');
const CATEGORY_COL = columnId('category');
const CREATED_COL = columnId('created');
const PRIORITY_COL = columnId('priority');
const PERCENT_COL = columnId('percentComplete');
const STATUS_NOTE_COL = columnId('statusNote');
const EXPIRES_COL = columnId('expiresAt');
const ASSIGNEE_COL = columnId('assigneeId');
const LABELS_COL = columnId('labels');

const INBOX_COL_DEFS = [
  { id: ITEM_ID_COL, type: ColumnType.TEXT, getValue: (row: WorkItemRootResponse) => row.item.id },
  { id: TITLE_COL, name: 'Title', type: ColumnType.TEXT, getValue: (row: WorkItemRootResponse) => row.item.title },
  { id: STATUS_COL, name: 'Status', type: ColumnType.TEXT, getValue: (row: WorkItemRootResponse) => row.item.status },
  { id: CATEGORY_COL, name: 'Category', type: ColumnType.TEXT, getValue: (row: WorkItemRootResponse) => row.item.category },
  { id: CREATED_COL, name: 'Created', type: ColumnType.DATE, getValue: (row: WorkItemRootResponse) => row.item.createdAt },
  { id: PRIORITY_COL, type: ColumnType.TEXT, getValue: (row: WorkItemRootResponse) => row.item.priority },
  { id: PERCENT_COL, name: 'Progress', type: ColumnType.NUMBER, getValue: (row: WorkItemRootResponse) => row.item.percentComplete },
  { id: STATUS_NOTE_COL, name: 'Note', type: ColumnType.TEXT, getValue: (row: WorkItemRootResponse) => row.item.statusNote },
  { id: EXPIRES_COL, name: 'Deadline', type: ColumnType.DATE, getValue: (row: WorkItemRootResponse) => row.item.expiresAt },
  { id: ASSIGNEE_COL, name: 'Assignee', type: ColumnType.TEXT, getValue: (row: WorkItemRootResponse) => row.item.assigneeId },
  { id: LABELS_COL, name: 'Labels', type: ColumnType.TEXT, getValue: (row: WorkItemRootResponse) => row.item.labels.map(l => l.value ?? l.name).join(', ') },
] as const;

const INBOX_COL_CONFIG: readonly TableColumnConfig[] = [
  { id: ITEM_ID_COL, visible: false },
  { id: TITLE_COL, sortable: true, width: '3fr' },
  { id: STATUS_COL, sortable: true, width: '1fr' },
  { id: PRIORITY_COL, sortable: true, width: '80px' },
  { id: CATEGORY_COL, sortable: true, width: '1fr' },
  { id: CREATED_COL, sortable: true, width: '1fr' },
  { id: PERCENT_COL, sortable: true, width: '120px', visible: false },
  { id: STATUS_NOTE_COL, sortable: true, width: '1fr', visible: false },
  { id: EXPIRES_COL, sortable: true, width: '1fr', visible: false },
  { id: ASSIGNEE_COL, sortable: true, width: '1fr', visible: false },
  { id: LABELS_COL, sortable: true, width: '1fr', visible: false },
];

const WorkItemInboxBase = PushMixin(LiveRegionMixin(KeyboardShortcutMixin(LitElement)));

@customElement('blocks-work-item-inbox')
export class WorkItemInbox extends WorkItemInboxBase {
  @property({ type: Object }) identity!: WorkIdentity;
  @property({ type: String }) endpoint?: string;
  @property({ type: Array }) data?: WorkItemRootResponse[];
  @property({ type: String }) mode: InboxMode = 'my-work';

  @state() private activeTab: InboxMode = 'my-work';
  @state() private items: WorkItemRootResponse[] = [];
  @state() private summary: InboxSummary | null = null;
  @state() private loading = false;
  @state() private error: string | null = null;

  // Filter state
  @state() private statusFilter: Set<string> = new Set();
  @state() private priorityFilter: Set<string> = new Set();
  @state() private selectedItems: Set<string> = new Set();
  @state() private overdueFilter = false;
  @state() private claimBreachFilter = false;
  @state() private batchProcessing = false;
  @state() private batchError: string | null = null;
  @state() private _claimError: string | null = null;
  @state() private _showCancelDialog = false;
  @state() private _pendingCancelItems: string[] = [];
  @state() private _tableDataSet: import('@casehubio/pages-data/dist/dataset/types.js').TypedDataSet | undefined;

  // Queue scope
  @state() private _queueScope: QueueScope | null = null;
  @state() private _queueLoading = false;
  @state() private _queueError: string | null = null;
  private _queueFetchController: AbortController | null = null;
  private _unsubscribeQueueScope?: () => void;
  private _queuePushCleanup: (() => void) | null = null;

  private _queuePushStream: EventStream | null = null;

  private static _priorityColors: Record<string, string> = {
    urgent: 'background: var(--pages-danger-4, #fee2e2); color: var(--pages-danger-11, #991b1b);',
    high: 'background: var(--pages-warning-4, #fef3c7); color: var(--pages-warning-11, #92400e);',
    medium: 'background: var(--pages-info-4, #dbeafe); color: var(--pages-info-11, #0369a1);',
    low: 'background: var(--pages-neutral-4, #e5e5e5); color: var(--pages-neutral-11, #555555);',
  };

  private _columnRenderers: ReadonlyMap<ColumnId, ColumnRenderer> = new Map([
    [STATUS_COL, (cell: CellValue) => {
      const status = cell.type === 'NULL' ? '' : (cell as { value: string }).value;
      return html`<pages-status-badge domain="workitem" state=${status} size="sm" showIcon></pages-status-badge>`;
    }],
    [PRIORITY_COL, (cell: CellValue) => {
      const priority = cell.type === 'NULL' ? '' : (cell as { value: string }).value;
      const colors = WorkItemInbox._priorityColors[priority.toLowerCase()] ?? '';
      return html`<span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; ${colors}">${priority}</span>`;
    }],
    [CREATED_COL, (cell: CellValue) => {
      if (cell.type === 'NULL') return html`<span>—</span>`;
      const date = (cell as { value: Date }).value;
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return html`<span>Just now</span>`;
      if (diffMins < 60) return html`<span>${diffMins}m ago</span>`;
      if (diffHours < 24) return html`<span>${diffHours}h ago</span>`;
      if (diffDays < 7) return html`<span>${diffDays}d ago</span>`;
      return html`<span>${date.toLocaleDateString()}</span>`;
    }],
    [PERCENT_COL, (cell: CellValue) => {
      if (cell.type === 'NULL') return html`<span>—</span>`;
      const pct = (cell as { value: number }).value;
      return html`<span role="img" aria-label="${pct}% complete" style="display: inline-flex; align-items: center; gap: 6px;"><span style="display: inline-block; width: 60px; height: 6px; border-radius: 3px; background: var(--pages-neutral-4, #e5e5e5); overflow: hidden;"><span style="display: block; height: 100%; width: ${pct}%; border-radius: 3px; background: var(--pages-accent-9, #0066cc);"></span></span><span style="font-size: 11px; color: var(--pages-neutral-11, #555555);">${pct}%</span></span>`;
    }],
    [EXPIRES_COL, (cell: CellValue) => {
      if (cell.type === 'NULL') return html`<span>—</span>`;
      const date = (cell as { value: Date }).value;
      const now = new Date();
      const overdue = date.getTime() < now.getTime();
      const style = overdue ? 'color: var(--pages-danger-11, #991b1b); font-weight: 600;' : '';
      return html`<span style="${style}">${date.toLocaleDateString()}</span>`;
    }],
    [LABELS_COL, (cell: CellValue) => {
      const text = cell.type === 'NULL' ? '' : (cell as { value: string }).value;
      if (!text) return html`<span>—</span>`;
      const tags = text.split(', ');
      return html`<span style="display: inline-flex; gap: 4px; flex-wrap: wrap;">${tags.map(t => html`<span style="display: inline-block; padding: 1px 6px; border-radius: 10px; font-size: 10px; background: var(--pages-neutral-4, #e5e5e5); color: var(--pages-neutral-11, #555555);">${t}</span>`)}</span>`;
    }],
  ]);

  static override readonly styles = css`
    :host {
      display: block;
      container-type: inline-size;
      background: var(--pages-neutral-1, #ffffff);
      border-radius: 8px;
      overflow: hidden;
    }

    .inbox-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .tabs {
      display: flex;
      gap: 0;
      border-bottom: 1px solid var(--pages-neutral-6, #e0e0e0);
      padding: 0 16px;
      background: var(--pages-neutral-2, #fafafa);
    }

    .tab {
      padding: 12px 24px;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      font-size: 14px;
      font-weight: 500;
      color: var(--pages-neutral-11, #555555);
      cursor: pointer;
      transition: all 0.2s;
    }

    @media (prefers-reduced-motion: no-preference) {
      .tab {
        transition: border-color 0.2s, color 0.2s;
      }
    }

    .tab:hover {
      color: var(--pages-neutral-12, #000000);
    }

    .tab.active {
      color: var(--pages-accent-11, #0066cc);
      border-bottom-color: var(--pages-accent-9, #0080ff);
    }

    .summary-bar {
      padding: 12px 16px;
      border-bottom: 1px solid var(--pages-neutral-6, #e0e0e0);
      background: var(--pages-neutral-2, #fafafa);
    }

    .filter-bar {
      padding: 12px 16px;
      border-bottom: 1px solid var(--pages-neutral-6, #e0e0e0);
      background: var(--pages-neutral-2, #fafafa);
    }

    .items-list {
      flex: 1;
      overflow: hidden;
      position: relative;
    }

    pages-table {
      height: 100%;
    }

    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      color: var(--pages-neutral-11, #555555);
      font-size: 14px;
      text-align: center;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      color: var(--pages-neutral-11, #555555);
    }

    .error {
      padding: 16px;
      background: var(--pages-danger-3, #fee);
      color: var(--pages-danger-11, #c00);
      border-radius: 4px;
      margin: 16px;
    }

    /* Responsive: Medium (480-768px) - tighter spacing */
    @container (max-width: 768px) {
      .tabs {
        padding: 0 12px;
      }

      .tab {
        padding: 10px 16px;
        font-size: 13px;
      }

      .summary-bar,
      .filter-bar {
        padding: 10px 12px;
      }

      .items-list {
        padding: 6px;
      }
    }

    /* Responsive: Compact (<480px) - card layout */
    @container (max-width: 480px) {
      .tabs {
        padding: 0 8px;
      }

      .tab {
        padding: 8px 12px;
        font-size: 12px;
      }

      .summary-bar,
      .filter-bar {
        padding: 8px;
      }

      .items-list {
        padding: 4px;
      }

      .item-row {
        margin-bottom: 8px;
      }
    }

    /* Batch operations floating action bar */
    .batch-action-bar {
      position: fixed;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--pages-neutral-1, #ffffff);
      border: 1px solid var(--pages-neutral-6, #e0e0e0);
      border-radius: 8px;
      padding: 12px 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 100;
    }

    .batch-count {
      font-size: 14px;
      font-weight: 500;
      color: var(--pages-neutral-11, #555555);
    }

    .batch-button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }

    @media (prefers-reduced-motion: no-preference) {
      .batch-button {
        transition: background 0.15s, transform 0.1s;
      }
    }

    .batch-button:hover {
      transform: translateY(-1px);
    }

    .batch-button:active {
      transform: translateY(0);
    }

    .batch-button.primary {
      background: var(--pages-accent-9, #0080ff);
      color: white;
    }

    .batch-button.primary:hover {
      background: var(--pages-accent-10, #0066cc);
    }

    .batch-button.danger {
      background: var(--pages-danger-9, #ff3333);
      color: white;
    }

    .batch-button.danger:hover {
      background: var(--pages-danger-10, #cc0000);
    }

    .batch-button.secondary {
      background: var(--pages-neutral-3, #f5f5f5);
      color: var(--pages-neutral-11, #555555);
    }

    .batch-button.secondary:hover {
      background: var(--pages-neutral-4, #eeeeee);
    }

    .batch-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .tab-count {
      font-size: 11px;
      color: var(--pages-neutral-7, #a3a3a3);
    }

    .tab.active .tab-count {
      color: var(--pages-accent-9, #0080ff);
    }

    .error-banner {
      padding: var(--pages-space-3, 12px) var(--pages-space-4, 16px);
      background: var(--pages-danger-3, #fee);
      color: var(--pages-danger-11, #c00);
      border-radius: var(--pages-radius-sm, 4px);
      margin: var(--pages-space-2, 8px) var(--pages-space-4, 16px);
      font-size: var(--pages-font-size-base, 14px);
    }



    .status-pill.status-obsolete {
      background: var(--pages-neutral-4, #e5e5e5);
      color: var(--pages-neutral-11, #555555);
    }

    .status-pill.status-expired {
      background: var(--pages-danger-4, #fee2e2);
      color: var(--pages-danger-11, #991b1b);
    }

    .status-pill.status-escalated {
      background: var(--pages-warning-4, #fef3c7);
      color: var(--pages-warning-11, #92400e);
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.activeTab = this.mode;

    // Register keyboard shortcuts
    this.registerShortcut('c', () => this.handleClaimShortcut(), {
      description: 'Claim focused item',
    });

    if (this.data) {
      this.items = this.data;
    } else if (this.endpoint != null) {
      this.fetchItems();
      if (!this.pushTopics.length) {
        this.pushTopics = ['work-items:lifecycle:*'];
      }
    }

    this._unsubscribeQueueScope = onPagesEvent<QueueScopeChangedPayload>(
      this, WorkItemEventTopics.QUEUE_SCOPE_CHANGED,
      (payload) => this._handleQueueScopeChanged(payload),
    );
    this.addEventListener('keydown', this._handleEscapeKey);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeQueueScope?.();
    this._teardownQueuePush();
    this._queueFetchController?.abort();
    this.removeEventListener('keydown', this._handleEscapeKey);
  }

  configure(props: Partial<WorkItemInbox>) {
    if (props.identity) this.identity = props.identity;
    if (props.endpoint !== undefined) this.endpoint = props.endpoint as string;
    if (props.data) this.data = props.data;
    if (props.mode) this.mode = props.mode;
  }

  protected override onPushEvent(event: unknown): void {
    this._handlePushEvent(event as WorkItemLifecycleEvent);
  }

  private _handlePushEvent(data: WorkItemLifecycleEvent): void {
    const eventType = data.type as WorkEventType;
    const workItemId = data.workItemId;
    if (!workItemId) return;

    if (
      eventType === WorkEventTypeEnum.CREATED ||
      eventType === WorkEventTypeEnum.ASSIGNED ||
      eventType === WorkEventTypeEnum.SLA_REASSIGNED
    ) {
      this.handleItemAppears(workItemId);
      return;
    }

    if (
      eventType === WorkEventTypeEnum.COMPLETED ||
      eventType === WorkEventTypeEnum.REJECTED ||
      eventType === WorkEventTypeEnum.FAULTED ||
      eventType === WorkEventTypeEnum.CANCELLED ||
      eventType === WorkEventTypeEnum.OBSOLETE ||
      eventType === WorkEventTypeEnum.EXPIRED ||
      eventType === WorkEventTypeEnum.ESCALATED
    ) {
      this.handleItemDisappears(workItemId);
      return;
    }

    if (
      eventType === WorkEventTypeEnum.STARTED ||
      eventType === WorkEventTypeEnum.SUSPENDED ||
      eventType === WorkEventTypeEnum.RESUMED ||
      eventType === WorkEventTypeEnum.RELEASED ||
      eventType === WorkEventTypeEnum.DELEGATED ||
      eventType === WorkEventTypeEnum.DELEGATION_ACCEPTED ||
      eventType === WorkEventTypeEnum.DELEGATION_DECLINED ||
      eventType === WorkEventTypeEnum.PROGRESS_UPDATE ||
      eventType === WorkEventTypeEnum.DEADLINE_EXTENDED ||
      eventType === WorkEventTypeEnum.SLA_EXTENDED ||
      eventType === WorkEventTypeEnum.MANUALLY_ESCALATED
    ) {
      this.handleItemUpdated(workItemId);
      return;
    }

    if (
      eventType === WorkEventTypeEnum.LABEL_ADDED ||
      eventType === WorkEventTypeEnum.LABEL_REMOVED
    ) {
      this.handleItemUpdated(workItemId);
      return;
    }

    if (
      eventType === WorkEventTypeEnum.SPAWNED ||
      eventType === WorkEventTypeEnum.SIGNAL_RECEIVED ||
      eventType === WorkEventTypeEnum.CLAIM_EXPIRED
    ) {
      this.fetchSummary();
      return;
    }
  }

  private async handleItemAppears(workItemId: string) {
    if (this.endpoint == null) return;

    try {
      const response = await fetch(`${this.endpoint}/workitems/${workItemId}`);
      if (!response.ok) return;

      const raw = await response.json() as Record<string, unknown>;
      // Defensive: handle both wrapped {item: WorkItemResponse} and unwrapped WorkItemResponse
      const newItem: WorkItemRootResponse = raw.item && typeof (raw.item as Record<string, unknown>).id === 'string'
        ? raw as unknown as WorkItemRootResponse
        : { item: raw as unknown as WorkItemResponse, childCount: 0, completedCount: null, requiredCount: null, groupStatus: null };
      const existsAlready = this.items.some((item) => item.item.id === workItemId);

      const shouldBeVisible =
        (newItem.item.assigneeId === this.identity.userId && isActiveStatus(newItem.item.status)) ||
        (newItem.item.status === 'PENDING' && newItem.item.candidateGroups &&
          this.identity.groups.some((g) => newItem.item.candidateGroups!.split(',').includes(g)));

      if (existsAlready && !shouldBeVisible) {
        this.items = this.items.filter((item) => item.item.id !== workItemId);
        this.selectedItems.delete(workItemId);
      } else if (existsAlready && shouldBeVisible) {
        const index = this.items.findIndex((item) => item.item.id === workItemId);
        this.items = [...this.items.slice(0, index), newItem, ...this.items.slice(index + 1)];
      } else if (!existsAlready && shouldBeVisible) {
        this.items = [newItem, ...this.items];
      }

      this.fetchSummary();
    } catch (e) {
      console.error('Failed to fetch new item:', e);
    }
  }

  private handleItemDisappears(workItemId: string) {
    const index = this.items.findIndex((item) => item.item.id === workItemId);
    if (index !== -1) {
      this.items = this.items.filter((item) => item.item.id !== workItemId);
      this.selectedItems.delete(workItemId);
      this.fetchSummary();
      this.requestUpdate();
    }
  }

  private async handleItemUpdated(workItemId: string) {
    if (this.endpoint == null) return;

    try {
      const response = await fetch(`${this.endpoint}/workitems/${workItemId}`);
      if (!response.ok) return;

      const raw = await response.json() as Record<string, unknown>;
      const updatedItem: WorkItemRootResponse = raw.item && typeof (raw.item as Record<string, unknown>).id === 'string'
        ? raw as unknown as WorkItemRootResponse
        : { item: raw as unknown as WorkItemResponse, childCount: 0, completedCount: null, requiredCount: null, groupStatus: null };

      // Update in place
      const index = this.items.findIndex((item) => item.item.id === workItemId);
      if (index !== -1) {
        this.items = [
          ...this.items.slice(0, index),
          updatedItem,
          ...this.items.slice(index + 1),
        ];
        this.fetchSummary();
        this.requestUpdate();
      }
    } catch (e) {
      console.error('Failed to fetch updated item:', e);
    }
  }

  private async fetchSummary() {
    if (this.endpoint == null) return;

    try {
      const response = await fetch(`${this.endpoint}/workitems/inbox/summary`);
      if (!response.ok) return;

      this.summary = await response.json();
      this.requestUpdate();
    } catch (e) {
      console.error('Failed to fetch summary:', e);
    }
  }

  private async fetchItems() {
    if (this.endpoint == null) return;

    this.loading = true;
    this.error = null;

    try {
      const [itemsResponse, summaryResponse] = await Promise.all([
        fetch(`${this.endpoint}/workitems/inbox`),
        fetch(`${this.endpoint}/workitems/inbox/summary`),
      ]);

      if (!itemsResponse.ok) throw new Error(`HTTP ${itemsResponse.status}`);
      if (!summaryResponse.ok) throw new Error(`HTTP ${summaryResponse.status}`);

      const items = await itemsResponse.json();
      const summary = await summaryResponse.json();

      this.items = items;
      this.summary = summary;
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to fetch items';
    } finally {
      this.loading = false;
    }
  }

  private getTabItems(): WorkItemRootResponse[] {
    const source = this._queueScope ? this._queueScope.items : this.items;
    if (this.activeTab === 'my-work') {
      return source.filter(
        (item) =>
          item.item.assigneeId === this.identity.userId &&
          isActiveStatus(item.item.status),
      );
    }
    if (this.activeTab === 'claimable') {
      return source.filter(
        (item) =>
          item.item.status === 'PENDING' &&
          item.item.candidateGroups &&
          this.identity.groups.some((g) =>
            item.item.candidateGroups!.split(',').includes(g),
          ),
      );
    }
    // 'all' — no perspective filter
    return source;
  }

  getTabOverdueCount(): number {
    const now = new Date();
    return this.getTabItems().filter(
      (r) => r.item.expiresAt && new Date(r.item.expiresAt) < now && isActiveStatus(r.item.status),
    ).length;
  }

  getTabBreachCount(): number {
    const now = new Date();
    return this.getTabItems().filter(
      (r) => r.item.claimDeadline && new Date(r.item.claimDeadline) < now && r.item.status === 'PENDING',
    ).length;
  }

  private getFilteredItems(): WorkItemRootResponse[] {
    let filtered = this._queueScope ? this._queueScope.items : this.items;

    // Mode filtering
    if (this.activeTab === 'all') {
      // No perspective filter — full population
    } else if (this.activeTab === 'my-work') {
      filtered = filtered.filter(
        (item) =>
          item.item.assigneeId === this.identity.userId &&
          isActiveStatus(item.item.status),
      );
    } else {
      // claimable
      filtered = filtered.filter(
        (item) =>
          item.item.status === 'PENDING' &&
          item.item.candidateGroups &&
          this.identity.groups.some((g) =>
            item.item.candidateGroups!.split(',').includes(g),
          ),
      );
    }

    // Status filter
    if (this.statusFilter.size > 0) {
      filtered = filtered.filter((item) => this.statusFilter.has(item.item.status));
    }

    // Priority filter
    if (this.priorityFilter.size > 0) {
      filtered = filtered.filter((item) => this.priorityFilter.has(item.item.priority));
    }

    // Overdue / Claim breach filters — OR logic when both active.
    // These are nearly disjoint populations (overdue = active past expiry,
    // breach = PENDING past claim deadline). AND produces zero results.
    if (this.overdueFilter || this.claimBreachFilter) {
      const now = new Date();
      filtered = filtered.filter((item) => {
        if (this.overdueFilter && item.item.expiresAt) {
          if (new Date(item.item.expiresAt) < now && isActiveStatus(item.item.status)) return true;
        }
        if (this.claimBreachFilter && item.item.claimDeadline) {
          if (new Date(item.item.claimDeadline) < now && item.item.status === 'PENDING') return true;
        }
        return false;
      });
    }

    return filtered;
  }


  override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('activeTab') && this.activeTab !== 'claimable') {
      this.claimBreachFilter = false;
    }
    if (changed.has('items') || changed.has('activeTab') ||
        changed.has('statusFilter') || changed.has('priorityFilter') ||
        changed.has('overdueFilter') || changed.has('claimBreachFilter') ||
        changed.has('_queueScope')) {
      this._rebuildTableDataSet();
    }
  }

  private _rebuildTableDataSet(): void {
    const filtered = this.getFilteredItems();
    this._tableDataSet = filtered.length > 0 ? fromRows(filtered, INBOX_COL_DEFS) : undefined;
  }

  private handleTabClick(tab: InboxMode) {
    this.activeTab = tab;
    this.selectedItems.clear();
  }

  private async handleBatchClaim() {
    if (!this.endpoint || this.selectedItems.size === 0) return;

    this.batchProcessing = true;
    this.batchError = null;

    const request: BulkRequest = {
      operation: 'claim',
      workItemIds: Array.from(this.selectedItems),
      actorId: this.identity.userId,
    };

    try {
      const response = await fetch(`${this.endpoint}/workitems/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const results: BulkItemResult[] = await response.json();
      const succeeded = results.filter((r) => r.status === 'success');
      const failed = results.filter((r) => r.status === 'failure');

      if (failed.length === 0) {
        // Full success
        this.selectedItems.clear();
        this.announce(`${succeeded.length} items claimed successfully`);
        // Items will refresh via push
      } else {
        // Partial failure
        const failedIds = new Set(failed.map((r) => r.id));
        this.selectedItems = new Set(Array.from(this.selectedItems).filter((id) => failedIds.has(id)));
        this.batchError = `${succeeded.length} of ${results.length} claimed — ${failed.length} failed`;
        this.announce(`${succeeded.length} items claimed, ${failed.length} failed`, 'assertive');
      }
    } catch (e) {
      this.batchError = e instanceof Error ? e.message : 'Batch claim failed';
      this.announce('Batch claim failed', 'assertive');
    } finally {
      this.batchProcessing = false;
      this.requestUpdate();
    }
  }

  private handleBatchCancel() {
    if (!this.endpoint || this.selectedItems.size === 0) return;
    this._showCancelDialog = true;
    this._pendingCancelItems = Array.from(this.selectedItems);
  }

  private async _confirmBatchCancel(e: CustomEvent) {
    this._showCancelDialog = false;
    if (!this.endpoint || this._pendingCancelItems.length === 0) return;

    this.batchProcessing = true;
    this.batchError = null;

    const request: BulkRequest = {
      operation: 'cancel',
      workItemIds: this._pendingCancelItems,
      actorId: this.identity.userId,
      reason: e.detail.reason,
    };
    this._pendingCancelItems = [];

    try {
      const response = await fetch(`${this.endpoint}/workitems/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const results: BulkItemResult[] = await response.json();
      const succeeded = results.filter((r) => r.status === 'success');
      const failed = results.filter((r) => r.status === 'failure');

      if (failed.length === 0) {
        // Full success
        this.selectedItems.clear();
        this.announce(`${succeeded.length} items cancelled`);
        // Items will refresh via push
      } else {
        // Partial failure
        const failedIds = new Set(failed.map((r) => r.id));
        this.selectedItems = new Set(Array.from(this.selectedItems).filter((id) => failedIds.has(id)));
        this.batchError = `${succeeded.length} of ${results.length} cancelled — ${failed.length} failed`;
        this.announce(`${succeeded.length} items cancelled, ${failed.length} failed`, 'assertive');
      }
    } catch (e) {
      this.batchError = e instanceof Error ? e.message : 'Batch cancel failed';
      this.announce('Batch cancel failed', 'assertive');
    } finally {
      this.batchProcessing = false;
      this.requestUpdate();
    }
  }

  private handleClearSelection() {
    this.selectedItems.clear();
    this.batchError = null;
    this.requestUpdate();
  }

  private _handleTableSelection(e: CustomEvent<SelectionChangeDetail>) {
    const { selectedKeys } = e.detail;
    this.selectedItems = new Set(selectedKeys);
    this.requestUpdate();
  }

  private _handleTableActivate(e: CustomEvent<RowActivateDetail>) {
    const { key } = e.detail;
    emitPagesEvent(document, WorkItemEventTopics.SELECTED, { workItemId: key });
  }

  private handleSummaryFilterClick(e: CustomEvent<FilterClickDetail>) {
    const { type } = e.detail;

    if (type === 'overdue') {
      this.overdueFilter = !this.overdueFilter;
    } else if (type === 'claimDeadlineBreached') {
      this.claimBreachFilter = !this.claimBreachFilter;
    }
  }

  private handleFilterChange(e: CustomEvent<FilterChangeDetail>) {
    const { type, value, active } = e.detail;

    if (type === 'status') {
      const next = new Set(this.statusFilter);
      if (active) { next.add(value); } else { next.delete(value); }
      this.statusFilter = next;
    } else if (type === 'priority') {
      const next = new Set(this.priorityFilter);
      if (active) { next.add(value); } else { next.delete(value); }
      this.priorityFilter = next;
    }
  }

  private handleClearFilters() {
    this.statusFilter = new Set();
    this.priorityFilter = new Set();
    this.overdueFilter = false;
    this.claimBreachFilter = false;
  }


  private handleClaimShortcut() {
    // C4 fix: Use selectedItems instead of roving tabindex
    if (this.activeTab !== 'claimable') return;
    if (this.selectedItems.size !== 1) return;
    const selectedId = this.selectedItems.values().next().value;
    const item = this.getFilteredItems().find(r => r.item.id === selectedId);
    if (item && item.item.status === 'PENDING') {
      this.claimItem(item.item.id);
    }
  }

  private async claimItem(workItemId: string) {
    if (this.endpoint == null) return;

    try {
      const response = await fetch(`${this.endpoint}/workitems/${workItemId}/claim`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimant: this.identity.userId }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      // Optimistic update - item will move to my-work via push or next fetch
      this.items = this.items.map((item) =>
        item.item.id === workItemId
          ? {
              ...item,
              item: {
                ...item.item,
                status: 'ASSIGNED' as const,
                assigneeId: this.identity.userId,
              },
            }
          : item,
      );
      this.announce('Item claimed successfully');
      this.requestUpdate();
    } catch (e) {
      this._claimError = 'Failed to claim item';
      this.announce('Failed to claim item', 'assertive');
      setTimeout(() => { this._claimError = null; this.requestUpdate(); }, 5000);
    }
  }

  private async _handleQueueScopeChanged(payload: QueueScopeChangedPayload) {
    // Abort any in-flight queue fetch
    this._queueFetchController?.abort();
    this._queueFetchController = null;

    if (!payload.queue) {
      this._teardownQueuePush();
      this._queueScope = null;
      this._queueLoading = false;
      this._queueError = null;
      return;
    }

    this._queueLoading = true;
    this._queueError = null;
    this._queueFetchController = new AbortController();

    try {
      const res = await fetch(
        `${this.endpoint}/queues/${payload.queue.id}/items`,
        { signal: this._queueFetchController.signal },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const items: WorkItemResponse[] = await res.json();

      const wrapped: WorkItemRootResponse[] = items.map(item => ({
        item,
        childCount: 0,
        completedCount: null,
        requiredCount: null,
        groupStatus: null,
      }));

      this._queueScope = this._buildQueueScope(payload.queue, wrapped);
      this._queueLoading = false;
      this._setupQueuePush(payload.queue.id);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      this._queueError = e instanceof Error ? e.message : 'Failed to load queue';
      this._queueLoading = false;
      this._queueScope = null;
    }
  }

  private _buildQueueScope(queue: QueueView, items: WorkItemRootResponse[]): QueueScope {
    const statusCounts = new Map<string, number>();
    const priorityCounts = new Map<string, number>();
    let overdueCount = 0;
    let breachCount = 0;
    const now = Date.now();

    for (const root of items) {
      const s = root.item.status;
      statusCounts.set(s, (statusCounts.get(s) ?? 0) + 1);
      const p = root.item.priority;
      priorityCounts.set(p, (priorityCounts.get(p) ?? 0) + 1);
      if (root.item.expiresAt && new Date(root.item.expiresAt).getTime() < now && isActiveStatus(root.item.status)) {
        overdueCount++;
      }
      if (root.item.claimDeadline && new Date(root.item.claimDeadline).getTime() < now && root.item.status === 'PENDING') {
        breachCount++;
      }
    }

    return { queue, items, statusCounts, priorityCounts, overdueCount, breachCount };
  }

  private _setupQueuePush(queueId: string): void {
    this._teardownQueuePush();
    if (!this.pushUrl) return;
    this._queuePushStream = new EventStream(this.pushUrl, [`work-items:queue:${queueId}:*`], {
      onChange: () => {
        const event = this._queuePushStream?.latest;
        if (event) this._handleQueuePushEvent(event as WorkItemQueueEvent);
      },
    });
    this._queuePushStream.connect();
  }

  private _teardownQueuePush(): void {
    this._queuePushStream?.disconnect();
    this._queuePushStream = null;
  }

  private async _handleQueuePushEvent(data: WorkItemQueueEvent): Promise<void> {
    if (!this._queueScope) return;
    if (data.queueViewId !== this._queueScope.queue.id) return;
    if (data.eventType === 'ADDED') await this._handleQueueItemAdded(data.workItemId);
    else if (data.eventType === 'REMOVED') this._handleQueueItemRemoved(data.workItemId);
    else if (data.eventType === 'CHANGED') await this._handleQueueItemChanged(data.workItemId);
  }

  private async _handleQueueItemAdded(workItemId: string) {
    if (!this.endpoint || !this._queueScope) return;
    try {
      const res = await fetch(`${this.endpoint}/workitems/${workItemId}`);
      if (!res.ok) return;
      const raw = await res.json() as Record<string, unknown>;
      const newItem: WorkItemRootResponse = raw.item && typeof (raw.item as Record<string, unknown>).id === 'string'
        ? raw as unknown as WorkItemRootResponse
        : { item: raw as unknown as WorkItemResponse, childCount: 0, completedCount: null, requiredCount: null, groupStatus: null };
      const items = [newItem, ...this._queueScope.items];
      this._queueScope = this._buildQueueScope(this._queueScope.queue, items);
      this.requestUpdate();
    } catch { /* non-fatal */ }
  }

  private _handleQueueItemRemoved(workItemId: string) {
    if (!this._queueScope) return;
    const items = this._queueScope.items.filter(r => r.item.id !== workItemId);
    this._queueScope = this._buildQueueScope(this._queueScope.queue, items);
    this.requestUpdate();
  }

  private async _handleQueueItemChanged(workItemId: string) {
    if (!this.endpoint || !this._queueScope) return;
    try {
      const res = await fetch(`${this.endpoint}/workitems/${workItemId}`);
      if (!res.ok) return;
      const raw = await res.json() as Record<string, unknown>;
      const updated: WorkItemRootResponse = raw.item && typeof (raw.item as Record<string, unknown>).id === 'string'
        ? raw as unknown as WorkItemRootResponse
        : { item: raw as unknown as WorkItemResponse, childCount: 0, completedCount: null, requiredCount: null, groupStatus: null };
      const items = this._queueScope.items.map(r => r.item.id === workItemId ? updated : r);
      this._queueScope = this._buildQueueScope(this._queueScope.queue, items);
      this.requestUpdate();
    } catch { /* non-fatal */ }
  }

  private _computeFilterCounts(): { statusCounts: Map<string, number>; priorityCounts: Map<string, number> } {
    const tabItems = this.getTabItems();
    const statusCounts = new Map<string, number>();
    const priorityCounts = new Map<string, number>();
    for (const root of tabItems) {
      const s = root.item.status;
      statusCounts.set(s, (statusCounts.get(s) ?? 0) + 1);
      const p = root.item.priority;
      priorityCounts.set(p, (priorityCounts.get(p) ?? 0) + 1);
    }
    return { statusCounts, priorityCounts };
  }

  private _handleScopeClear() {
    this._handleQueueScopeChanged({ queue: null });
  }

  private _handleEscapeKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this._queueScope) {
      e.preventDefault();
      this._handleScopeClear();
    }
  };

  private _renderQueuePillBar() {
    return html`
      <blocks-queue-pill-bar
        .endpoint="${this.endpoint}"
        .selectedQueueId="${this._queueScope?.queue.id ?? null}"
        .selectedQueueCount="${this._queueScope?.items.length ?? null}"
        @pages-event="${(e: CustomEvent) => {
          if (e.detail.topic === 'queue.scope-changed') {
            this._handleQueueScopeChanged(e.detail.payload);
          }
        }}"
      ></blocks-queue-pill-bar>
    `;
  }

  private renderTabs() {
    const source = this._queueScope ? this._queueScope.items : this.items;
    const myWorkCount = source.filter(r => r.item.assigneeId === this.identity.userId && isActiveStatus(r.item.status)).length;
    const claimableCount = source.filter(r => r.item.status === 'PENDING' && r.item.candidateGroups && this.identity.groups.some(g => r.item.candidateGroups!.split(',').includes(g))).length;
    const allCount = source.length;

    return html`
      <div class="tabs">
        <button
          class="tab ${this.activeTab === 'my-work' ? 'active' : ''}"
          @click="${() => this.handleTabClick('my-work')}"
          aria-current="${this.activeTab === 'my-work' ? 'page' : 'false'}"
        >
          My Work <span class="tab-count">(${myWorkCount})</span>
        </button>
        <button
          class="tab ${this.activeTab === 'claimable' ? 'active' : ''}"
          @click="${() => this.handleTabClick('claimable')}"
          aria-current="${this.activeTab === 'claimable' ? 'page' : 'false'}"
        >
          Claimable <span class="tab-count">(${claimableCount})</span>
        </button>
        <button
          class="tab ${this.activeTab === 'all' ? 'active' : ''}"
          @click="${() => this.handleTabClick('all')}"
          aria-current="${this.activeTab === 'all' ? 'page' : 'false'}"
        >
          All <span class="tab-count">(${allCount})</span>
        </button>
      </div>
    `;
  }

  private renderSummaryBar() {
    return html`
      <div class="summary-bar">
        <blocks-inbox-summary-bar
          .summary="${this.summary}"
          .visibleTotal=${this.getTabItems().length}
          .visibleOverdue=${this.getTabOverdueCount()}
          .visibleBreach=${this.getTabBreachCount()}
          .overdueActive=${this.overdueFilter}
          .claimBreachActive=${this.claimBreachFilter}
          .hideClaimBreach=${this.activeTab !== 'claimable'}
          @filter-click="${this.handleSummaryFilterClick}"
        ></blocks-inbox-summary-bar>
      </div>
    `;
  }

  private renderFilterBar() {
    const { statusCounts, priorityCounts } = this._computeFilterCounts();
    return html`
      <div class="filter-bar">
        <blocks-inbox-filter-bar
          .activeStatusFilters="${this.statusFilter}"
          .activePriorityFilters="${this.priorityFilter}"
          .statusCounts="${statusCounts}"
          .priorityCounts="${priorityCounts}"
          @filter-change="${this.handleFilterChange}"
          @clear-filters="${this.handleClearFilters}"
        ></blocks-inbox-filter-bar>
      </div>
    `;
  }

  private renderItems() {
    if (this.loading) {
      return html`<div class="loading">Loading...</div>`;
    }

    if (this.error) {
      return html`<div class="error">${this.error}</div>`;
    }

    if (!this._tableDataSet) {
      const message =
        this.activeTab === 'my-work'
          ? 'No items assigned to you'
          : 'No claimable items available';
      return html`<div class="empty-state">${message}</div>`;
    }

    return html`
      <div class="items-list">
        <pages-table
          .dataSet=${this._tableDataSet}
          .columnConfig=${INBOX_COL_CONFIG}
          .columnRenderers=${this._columnRenderers}
          .getRowKey=${(row: TypedRow) => row.text(ITEM_ID_COL)}
          .getRowClass=${(row: TypedRow) => 'priority-' + row.text(PRIORITY_COL).toLowerCase()}
          mode="auto"
          selection="multi"
          client-sort
          .selectedKeys=${Array.from(this.selectedItems)}
          @selection-change=${this._handleTableSelection}
          @row-activate=${this._handleTableActivate}
        ></pages-table>
      </div>
    `;
  }

  private renderBatchActionBar() {
    if (this.selectedItems.size < 2) return nothing;

    return html`
      <div class="batch-action-bar">
        <span class="batch-count">${this.selectedItems.size} items selected</span>

        ${this.activeTab === 'claimable'
          ? html`
              <button
                class="batch-button primary"
                @click="${this.handleBatchClaim}"
                ?disabled="${this.batchProcessing}"
              >
                ${this.batchProcessing ? 'Claiming...' : 'Batch Claim'}
              </button>
            `
          : nothing}
        ${this.activeTab === 'my-work'
          ? html`
              <button
                class="batch-button danger"
                @click="${this.handleBatchCancel}"
                ?disabled="${this.batchProcessing}"
              >
                ${this.batchProcessing ? 'Cancelling...' : 'Batch Cancel'}
              </button>
            `
          : nothing}

        <button
          class="batch-button secondary"
          @click="${this.handleClearSelection}"
          ?disabled="${this.batchProcessing}"
        >
          Clear
        </button>

        ${this.batchError
          ? html`<span style="color: var(--pages-danger-11, #cc0000);"
              >${this.batchError}</span
            >`
          : nothing}
      </div>
    `;
  }

  override render() {
    return html`
      <div class="inbox-container">
        ${this._renderQueuePillBar()}
        ${this._queueScope ? html`<blocks-scope-context-bar .queue="${this._queueScope.queue}" @scope-clear="${this._handleScopeClear}"></blocks-scope-context-bar>` : ''}
        ${this.renderTabs()}
        ${this.renderSummaryBar()}
        ${this.renderFilterBar()}
        ${this._claimError ? html`<div class="error-banner" role="alert">${this._claimError}</div>` : nothing}
        ${this._queueLoading ? html`<div class="loading">Loading queue...</div>` : ''}
        ${this._queueError ? html`<div class="error">${this._queueError}</div>` : ''}
        ${!this._queueLoading && !this._queueError ? this.renderItems() : ''}
        ${this.renderBatchActionBar()}
        <pages-confirm-dialog
          .open=${this._showCancelDialog}
          heading="Cancel items?"
          message="This will cancel ${this._pendingCancelItems.length} selected item(s)."
          confirmLabel="Cancel items"
          cancelLabel="Keep"
          confirmVariant="danger"
          .showReason=${true}
          @confirm=${this._confirmBatchCancel}
          @cancel=${() => { this._showCancelDialog = false; }}
        ></pages-confirm-dialog>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'blocks-work-item-inbox': WorkItemInbox;
  }
}
