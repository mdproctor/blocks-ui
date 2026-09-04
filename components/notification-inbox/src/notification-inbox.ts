import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { WorkIdentity } from '@casehubio/blocks-ui-core';
import { PagesConfirmDialog } from '@casehubio/pages-ui-components';
import { KeyboardShortcutMixin, LiveRegionMixin } from '@casehubio/pages-primitives/a11y';
import { PushMixin } from '@casehubio/pages-component';
import '@casehubio/pages-table';
import type { TableColumnConfig, ColumnRenderer, SelectionChangeDetail, RowActivateDetail } from '@casehubio/pages-table';
import { fromRows } from '@casehubio/pages-data/dist/dataset/conversion.js';
import { columnId, ColumnType } from '@casehubio/pages-data/dist/dataset/types.js';
import type { CellValue, ColumnId, TypedRow } from '@casehubio/pages-data/dist/dataset/types.js';
import type { Notification, NotificationPage } from './types.js';
import { NotificationApi } from './api.js';
import { emitNotificationEvent, NotificationEventTopics } from './events.js';

// --- Relative time helper ---

export function relativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  const weeks = Math.floor(diffDays / 7);
  const remainDays = diffDays % 7;
  if (diffDays < 30) return remainDays > 0 ? `${weeks}w${remainDays}d` : `${weeks}w`;
  const months = Math.floor(diffDays / 30);
  if (diffDays < 365) return `${months}mo`;
  const years = Math.floor(diffDays / 365);
  return `${years}y`;
}

// --- Tab type ---

type InboxTab = 'inbox' | 'archive';

// --- Column definitions ---

const N_ID_COL = columnId('id');
const N_TITLE_COL = columnId('title');
const N_BODY_COL = columnId('body');
const N_CATEGORY_COL = columnId('category');
const N_STATUS_COL = columnId('status');
const N_CREATED_COL = columnId('createdAt');
const N_SEVERITY_COL = columnId('severity');
const N_ACTION_URL_COL = columnId('actionUrl');

const NOTIFICATION_COL_DEFS = [
  { id: N_ID_COL, type: ColumnType.TEXT, getValue: (n: Notification) => n.id },
  { id: N_TITLE_COL, name: 'Notification', type: ColumnType.TEXT, getValue: (n: Notification) => n.title },
  { id: N_BODY_COL, type: ColumnType.TEXT, getValue: (n: Notification) => n.body ?? '' },
  { id: N_CATEGORY_COL, name: 'Category', type: ColumnType.TEXT, getValue: (n: Notification) => n.category },
  { id: N_STATUS_COL, type: ColumnType.TEXT, getValue: (n: Notification) => n.status },
  { id: N_CREATED_COL, name: 'Age', type: ColumnType.TEXT, getValue: (n: Notification) => n.createdAt },
  { id: N_SEVERITY_COL, type: ColumnType.TEXT, getValue: (n: Notification) => n.severity },
  { id: N_ACTION_URL_COL, type: ColumnType.TEXT, getValue: (n: Notification) => n.actionUrl ?? '' },
] as const;

const NOTIFICATION_COL_CONFIG: readonly TableColumnConfig[] = [
  { id: N_ID_COL, visible: false },
  { id: N_TITLE_COL, sortable: true, width: '1fr' },
  { id: N_BODY_COL, visible: false },
  { id: N_CATEGORY_COL, sortable: true, width: '140px' },
  { id: N_STATUS_COL, visible: false },
  { id: N_CREATED_COL, sortable: true, width: '70px' },
  { id: N_SEVERITY_COL, visible: false },
  { id: N_ACTION_URL_COL, visible: false },
];

const NOTIFICATION_RENDERERS: ReadonlyMap<ColumnId, ColumnRenderer> = new Map<ColumnId, ColumnRenderer>([
  [N_TITLE_COL, (_cell: CellValue, row: TypedRow) => {
    const title = row.text(N_TITLE_COL);
    const body = row.text(N_BODY_COL);
    const status = row.text(N_STATUS_COL);
    const unreadDot = status === 'UNREAD'
      ? html`<span style="display:inline-block;flex-shrink:0;width:8px;height:8px;border-radius:50%;background:var(--pages-accent-9,#2563eb);margin-top:6px" aria-label="Unread"></span>`
      : html`<span style="display:inline-block;width:8px;flex-shrink:0"></span>`;
    return html`
      <div style="display:flex;gap:8px;align-items:flex-start">
        ${unreadDot}
        <div style="display:flex;flex-direction:column;gap:2px;min-width:0">
          <span style="font-weight:500;color:var(--pages-neutral-12,#111)">${title}</span>
          ${body ? html`<span style="font-size:12px;color:var(--pages-neutral-9,#737373);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${body}</span>` : nothing}
        </div>
      </div>`;
  }],
  [N_CREATED_COL, (cell: CellValue) => {
    if (cell.type === 'NULL') return html``;
    return html`${relativeTime((cell as { value: string }).value)}`;
  }],
]);

// --- Component ---

const NotificationInboxBase = PushMixin(LiveRegionMixin(KeyboardShortcutMixin(LitElement)));

@customElement('blocks-notification-inbox')
export class NotificationInbox extends NotificationInboxBase {
  @property({ type: String }) endpoint?: string;
  @property({ type: Array }) data?: Notification[];
  @property({ type: Object }) identity?: WorkIdentity;

  /** Injectable fetch for testing */
  fetchFn: typeof fetch = fetch;



  // Internal state
  @state() private activeTab: InboxTab = 'inbox';
  @state() private items: Notification[] = [];
  @state() private loading = false;
  @state() private error: string | null = null;
  @state() private nextCursor: string | null = null;

  // Filter state
  @state() private categoryFilter: Set<string> = new Set();
  @state() private severityFilter: Set<string> = new Set();
  @state() private readStateFilter: 'all' | 'unread' = 'all';

  // Selection & batch
  @state() private selectedItems: Set<string> = new Set();
  @state() private batchProcessing = false;
  @state() private batchError: string | null = null;
  @state() private _showDismissDialog = false;
  @state() private _pendingDismissItems: string[] = [];

  // Optimistic rollback
  @state() private _actionError: string | null = null;


  // API
  private api?: NotificationApi;


  // Column renderers for pages-table
  private _columnRenderers = NOTIFICATION_RENDERERS;

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

    /* Tabs */
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

    .tab-count {
      font-size: 11px;
      color: var(--pages-neutral-7, #a3a3a3);
    }

    .tab.active .tab-count {
      color: var(--pages-accent-9, #0080ff);
    }

    /* Filter chips */
    .filter-bar {
      padding: 8px 16px;
      border-bottom: 1px solid var(--pages-neutral-6, #e0e0e0);
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      background: var(--pages-neutral-2, #fafafa);
    }

    .filter-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid var(--pages-neutral-6, #d4d4d4);
      background: var(--pages-neutral-1, #ffffff);
      color: var(--pages-neutral-11, #555555);
      transition: background 0.15s;
    }

    .filter-chip:hover {
      background: var(--pages-neutral-3, #f5f5f5);
    }

    .filter-chip.active {
      background: var(--pages-accent-3, #cce5ff);
      border-color: var(--pages-accent-7, #80bfff);
      color: var(--pages-accent-11, #0066cc);
    }

    .filter-chip .chip-count {
      font-size: 10px;
      opacity: 0.7;
    }

    /* Data table area */
    .items-list {
      flex: 1;
      overflow: hidden;
      position: relative;
    }

    pages-table {
      height: 100%;
    }

    /* Severity row borders */
    pages-table::part(severity-urgent) {
      border-left: 3px solid var(--pages-danger-9, #dc2626);
    }

    pages-table::part(severity-warning) {
      border-left: 3px solid var(--pages-warning-9, #d97706);
    }

    pages-table::part(severity-info) {
      border-left: 3px solid var(--pages-accent-9, #2563eb);
    }

    /* Empty and loading states */
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

    .error-banner {
      padding: var(--pages-space-3, 12px) var(--pages-space-4, 16px);
      background: var(--pages-danger-3, #fee);
      color: var(--pages-danger-11, #c00);
      border-radius: var(--pages-radius-sm, 4px);
      margin: var(--pages-space-2, 8px) var(--pages-space-4, 16px);
      font-size: var(--pages-font-size-base, 14px);
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

    .batch-error {
      color: var(--pages-danger-11, #cc0000);
      font-size: 13px;
    }

    /* Responsive: Medium */
    @container (max-width: 768px) {
      .tabs { padding: 0 12px; }
      .tab { padding: 10px 16px; font-size: 13px; }
      .filter-bar { padding: 6px 12px; }
    }

    /* Responsive: Compact */
    @container (max-width: 480px) {
      .tabs { padding: 0 8px; }
      .tab { padding: 8px 12px; font-size: 12px; }
      .filter-bar { padding: 4px 8px; }
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('aria-label', 'Notification inbox');

    // Keyboard shortcuts
    this.registerShortcut('d', () => this._handleDismissShortcut(), {
      description: 'Dismiss focused notification',
    });
    this.registerShortcut('m', () => this._handleMuteShortcut(), {
      description: 'Mute focused notification',
    });

    if (this.data) {
      this.items = [...this.data];
    } else if (this.endpoint != null) {
      this.api = new NotificationApi(this.endpoint, this.fetchFn);
      this.fetchItems();
      if (!this.pushTopics.length) this.pushTopics = ['notifications:*'];
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
  }

  // --- Data fetching ---

  refresh(): void {
    this.items = [];
    this.nextCursor = null;
    this.selectedItems = new Set();
    this.fetchItems();
  }

  private async fetchItems(): Promise<void> {
    if (this.endpoint == null) return;
    if (this.api == null) {
      this.api = new NotificationApi(this.endpoint, this.fetchFn);
    }

    this.loading = true;
    this.error = null;

    try {
      const statusParam = this.activeTab === 'inbox' ? 'UNREAD,READ' : 'DISMISSED';
      const page = await this.api.listNotifications({ status: statusParam });

      if (!Array.isArray(page.notifications)) {
        throw new Error('Invalid response: notifications must be an array');
      }

      this.items = page.notifications as Notification[];
      this.nextCursor = page.nextCursor;
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to fetch notifications';
    } finally {
      this.loading = false;
    }
  }

  private async fetchNextPage(): Promise<void> {
    if (this.endpoint == null || this.nextCursor == null || this.api == null) return;

    try {
      const statusParam = this.activeTab === 'inbox' ? 'UNREAD,READ' : 'DISMISSED';
      const page = await this.api.listNotifications({
        status: statusParam,
        cursor: this.nextCursor,
      });

      if (!Array.isArray(page.notifications)) return;

      // Append new items, deduplicate by id
      const existingIds = new Set(this.items.map(n => n.id));
      const newItems = (page.notifications as Notification[]).filter(n => !existingIds.has(n.id));
      this.items = [...this.items, ...newItems];
      this.nextCursor = page.nextCursor;
    } catch (e) {
      console.error('Failed to fetch next page:', e);
    }
  }

  // --- Push ---

  protected override onPushEvent(event: unknown): void {
    this._handlePushEvent(event as Notification);
  }

  private _handlePushEvent(notification: Notification): void {
    if (!notification || typeof notification.id !== 'string') return;

    const existingIndex = this.items.findIndex(n => n.id === notification.id);
    if (existingIndex !== -1) {
      this.items = [
        ...this.items.slice(0, existingIndex),
        notification,
        ...this.items.slice(existingIndex + 1),
      ];
    } else {
      this.items = [notification, ...this.items];
      this.announce(`New notification: ${notification.title}`);
    }
  }

  // --- Filtering ---

  private getFilteredItems(): Notification[] {
    let filtered = this.items;

    // Tab filter: inbox shows UNREAD + READ, archive shows DISMISSED
    if (this.activeTab === 'inbox') {
      filtered = filtered.filter(n => n.status === 'UNREAD' || n.status === 'READ');
    } else {
      filtered = filtered.filter(n => n.status === 'DISMISSED');
    }

    // Category filter (client-side)
    if (this.categoryFilter.size > 0) {
      filtered = filtered.filter(n => this.categoryFilter.has(n.category));
    }

    // Severity filter (client-side)
    if (this.severityFilter.size > 0) {
      filtered = filtered.filter(n => this.severityFilter.has(n.severity));
    }

    // Read-state filter (client-side, inbox tab only)
    if (this.activeTab === 'inbox' && this.readStateFilter === 'unread') {
      filtered = filtered.filter(n => n.status === 'UNREAD');
    }

    return filtered;
  }

  private computeFilterChips(): Array<{ id: string; label: string; count: number }> {
    const inboxItems = this.activeTab === 'inbox'
      ? this.items.filter(n => n.status === 'UNREAD' || n.status === 'READ')
      : this.items.filter(n => n.status === 'DISMISSED');

    // Category chips (dynamic)
    const categoryCounts = new Map<string, number>();
    for (const n of inboxItems) {
      categoryCounts.set(n.category, (categoryCounts.get(n.category) ?? 0) + 1);
    }
    const categoryChips = Array.from(categoryCounts.entries()).map(([cat, count]) => ({
      id: `cat:${cat}`,
      label: cat,
      count,
    }));

    // Severity chips (static set)
    const severityCounts = { URGENT: 0, WARNING: 0, INFO: 0 };
    for (const n of inboxItems) {
      if (n.severity in severityCounts) {
        severityCounts[n.severity as keyof typeof severityCounts]++;
      }
    }
    const severityChips = [
      { id: 'sev:URGENT', label: 'Urgent', count: severityCounts.URGENT },
      { id: 'sev:WARNING', label: 'Warning', count: severityCounts.WARNING },
      { id: 'sev:INFO', label: 'Info', count: severityCounts.INFO },
    ];

    // Read-state chip (inbox tab only)
    const readStateChips = this.activeTab === 'inbox'
      ? [{ id: 'read:unread', label: 'Unread', count: inboxItems.filter(n => n.status === 'UNREAD').length }]
      : [];

    return [...categoryChips, ...severityChips, ...readStateChips];
  }

  private get activeFilterIds(): Set<string> {
    const ids = new Set<string>();
    for (const cat of this.categoryFilter) {
      ids.add(`cat:${cat}`);
    }
    for (const sev of this.severityFilter) {
      ids.add(`sev:${sev}`);
    }
    if (this.readStateFilter === 'unread') {
      ids.add('read:unread');
    }
    return ids;
  }

  private handleChipClick(chipId: string): void {
    if (chipId.startsWith('cat:')) {
      const category = chipId.slice(4);
      const next = new Set(this.categoryFilter);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      this.categoryFilter = next;
    } else if (chipId.startsWith('sev:')) {
      const severity = chipId.slice(4);
      const next = new Set(this.severityFilter);
      if (next.has(severity)) {
        next.delete(severity);
      } else {
        next.add(severity);
      }
      this.severityFilter = next;
    } else if (chipId === 'read:unread') {
      this.readStateFilter = this.readStateFilter === 'unread' ? 'all' : 'unread';
    }
  }

  // --- Tab handling ---

  private handleTabClick(tab: InboxTab): void {
    if (this.activeTab === tab) return;

    this.activeTab = tab;
    this.selectedItems = new Set();
    this.categoryFilter = new Set();
    this.severityFilter = new Set();
    this.readStateFilter = 'all';
    this.nextCursor = null;

    if (this.endpoint != null) {
      this.fetchItems();
    }
  }

  // --- Row actions ---

  private _handleTableActivate(e: CustomEvent<RowActivateDetail>): void {
    const detail = e.detail;
    const key = detail.key!;
    const row = detail.row;
    const actionUrl = row.text(N_ACTION_URL_COL);
    const status = row.text(N_STATUS_COL);

    emitNotificationEvent(this, NotificationEventTopics.SELECTED, {
      notificationId: key,
      actionUrl: actionUrl || undefined,
    });

    if (status === 'UNREAD' && this.endpoint != null) {
      this.markRead(key);
    }
  }

  private _handleTableSelection(e: CustomEvent<SelectionChangeDetail>): void {
    const { selectedKeys } = e.detail;
    this.selectedItems = new Set(selectedKeys);
  }

  private _handleLoadMore(): void {
    this.fetchNextPage();
  }

  // --- Single actions ---

  private async markRead(notificationId: string): Promise<void> {
    if (this.api == null) return;

    // Snapshot for rollback
    const snapshot = this.items.map(n => ({ ...n }));

    // Optimistic update
    this.items = this.items.map(n =>
      n.id === notificationId ? { ...n, status: 'READ' as const } : n,
    );

    try {
      const result = await this.api.markRead(notificationId);
      // Validate response shape
      if (!result || typeof result.id !== 'string') {
        throw new Error('Invalid response shape');
      }
      // Replace with server response
      this.items = this.items.map(n =>
        n.id === notificationId ? result : n,
      );
    } catch (e) {
      // Rollback
      this.items = snapshot;
      this._actionError = 'Failed to mark notification as read';
      setTimeout(() => { this._actionError = null; this.requestUpdate(); }, 5000);
    }
  }

  /** Public method for dismissing a notification (also used by keyboard shortcut). */
  async dismissNotification(notificationId: string): Promise<void> {
    if (this.api == null) return;

    // Snapshot for rollback
    const snapshot = this.items.map(n => ({ ...n }));

    // Optimistic: mark as DISMISSED (in inbox tab, this removes it from view)
    this.items = this.items.map(n =>
      n.id === notificationId ? { ...n, status: 'DISMISSED' as const } : n,
    );

    try {
      const result = await this.api.dismiss(notificationId);
      if (!result || typeof result.id !== 'string') {
        throw new Error('Invalid response shape');
      }
      // Replace with server response
      this.items = this.items.map(n =>
        n.id === notificationId ? result : n,
      );
      emitNotificationEvent(this, NotificationEventTopics.DISMISSED, { notificationId });
    } catch (e) {
      // Rollback
      this.items = snapshot;
      this._actionError = 'Failed to dismiss notification';
      setTimeout(() => { this._actionError = null; this.requestUpdate(); }, 5000);
    }
  }

  private async muteNotification(notificationId: string): Promise<void> {
    const notification = this.items.find(n => n.id === notificationId);
    if (!notification || this.api == null) return;

    try {
      await this.api.addMuteRule({
        userId: notification.userId,
        tenancyId: notification.tenancyId,
        scope: 'ENTITY',
        scopeId: notification.source.entityId,
        entityType: notification.source.entityType,
      });
      emitNotificationEvent(this, NotificationEventTopics.MUTED, { notificationId });
      this.announce('Notification muted');
    } catch (e) {
      this._actionError = 'Failed to mute notification';
      setTimeout(() => { this._actionError = null; this.requestUpdate(); }, 5000);
    }
  }

  // --- Batch actions ---

  private async handleBatchMarkRead(): Promise<void> {
    if (this.endpoint == null || this.api == null || this.selectedItems.size === 0) return;

    this.batchProcessing = true;
    this.batchError = null;

    const ids = Array.from(this.selectedItems);

    // Snapshot for rollback
    const snapshot = this.items.map(n => ({ ...n }));

    // Optimistic update
    this.items = this.items.map(n =>
      this.selectedItems.has(n.id) ? { ...n, status: 'READ' as const } : n,
    );

    try {
      const results = await Promise.allSettled(
        ids.map(id => this.api!.markRead(id)),
      );

      const failed = results.filter(r => r.status === 'rejected');
      const succeeded = results.filter(r => r.status === 'fulfilled');

      if (failed.length === 0) {
        this.selectedItems = new Set();
        this.announce(`${succeeded.length} notifications marked as read`);
      } else {
        // Partial failure: restore failed items from snapshot
        const failedIds = new Set(ids.filter((_, i) => results[i]?.status === 'rejected'));
        // Restore only the failed items
        this.items = this.items.map(n => {
          if (failedIds.has(n.id)) {
            const original = snapshot.find(s => s.id === n.id);
            return original ?? n;
          }
          return n;
        });
        this.selectedItems = failedIds;
        this.batchError = `${succeeded.length} of ${ids.length} marked read — ${failed.length} failed`;
        this.announce(`${succeeded.length} marked read, ${failed.length} failed`, 'assertive');
      }
    } catch (e) {
      this.items = snapshot;
      this.batchError = e instanceof Error ? e.message : 'Batch mark read failed';
      this.announce('Batch mark read failed', 'assertive');
    } finally {
      this.batchProcessing = false;
    }
  }

  private handleBatchDismiss(): void {
    if (this.selectedItems.size === 0) return;
    this._showDismissDialog = true;
    this._pendingDismissItems = Array.from(this.selectedItems);
  }

  private async _confirmBatchDismiss(): Promise<void> {
    this._showDismissDialog = false;
    if (this.api == null || this._pendingDismissItems.length === 0) return;

    this.batchProcessing = true;
    this.batchError = null;

    const ids = [...this._pendingDismissItems];
    this._pendingDismissItems = [];

    // Snapshot for rollback
    const snapshot = this.items.map(n => ({ ...n }));

    // Optimistic update
    this.items = this.items.map(n =>
      ids.includes(n.id) ? { ...n, status: 'DISMISSED' as const } : n,
    );

    try {
      const results = await Promise.allSettled(
        ids.map(id => this.api!.dismiss(id)),
      );

      const failed = results.filter(r => r.status === 'rejected');
      const succeeded = results.filter(r => r.status === 'fulfilled');

      if (failed.length === 0) {
        this.selectedItems = new Set();
        this.announce(`${succeeded.length} notifications dismissed`);
      } else {
        const failedIds = new Set(ids.filter((_, i) => results[i]?.status === 'rejected'));
        this.items = this.items.map(n => {
          if (failedIds.has(n.id)) {
            const original = snapshot.find(s => s.id === n.id);
            return original ?? n;
          }
          return n;
        });
        this.selectedItems = failedIds;
        this.batchError = `${succeeded.length} of ${ids.length} dismissed — ${failed.length} failed`;
        this.announce(`${succeeded.length} dismissed, ${failed.length} failed`, 'assertive');
      }
    } catch (e) {
      this.items = snapshot;
      this.batchError = e instanceof Error ? e.message : 'Batch dismiss failed';
      this.announce('Batch dismiss failed', 'assertive');
    } finally {
      this.batchProcessing = false;
    }
  }

  private handleClearSelection(): void {
    this.selectedItems = new Set();
    this.batchError = null;
  }

  // --- Keyboard shortcuts ---

  private _handleDismissShortcut(): void {
    if (this.selectedItems.size !== 1) return;
    const selectedId = this.selectedItems.values().next().value;
    if (selectedId) {
      this.dismissNotification(selectedId);
    }
  }

  private _handleMuteShortcut(): void {
    if (this.selectedItems.size !== 1) return;
    const selectedId = this.selectedItems.values().next().value;
    if (selectedId) {
      this.muteNotification(selectedId);
    }
  }

  // --- Render ---

  private renderTabs() {
    const inboxItems = this.items.filter(n => n.status === 'UNREAD' || n.status === 'READ');
    const unreadCount = inboxItems.filter(n => n.status === 'UNREAD').length;

    return html`
      <div class="tabs">
        <button
          class="tab ${this.activeTab === 'inbox' ? 'active' : ''}"
          @click="${() => this.handleTabClick('inbox')}"
          aria-current="${this.activeTab === 'inbox' ? 'page' : 'false'}"
        >
          Inbox ${unreadCount > 0
            ? html`<span class="tab-count">(${unreadCount})</span>`
            : nothing}
        </button>
        <button
          class="tab ${this.activeTab === 'archive' ? 'active' : ''}"
          @click="${() => this.handleTabClick('archive')}"
          aria-current="${this.activeTab === 'archive' ? 'page' : 'false'}"
        >
          Archive
        </button>
      </div>
    `;
  }

  private renderFilterBar() {
    const chips = this.computeFilterChips();
    const activeIds = this.activeFilterIds;

    return html`
      <div class="filter-bar">
        ${chips.map(chip => html`
          <button
            class="filter-chip ${activeIds.has(chip.id) ? 'active' : ''}"
            data-chip-id="${chip.id}"
            @click="${() => this.handleChipClick(chip.id)}"
          >
            ${chip.label}
            <span class="chip-count">(${chip.count})</span>
          </button>
        `)}
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

    const filtered = this.getFilteredItems();

    if (filtered.length === 0) {
      const message = this.activeTab === 'inbox'
        ? 'No notifications'
        : 'No archived notifications';
      return html`<div class="empty-state">${message}</div>`;
    }

    const dataSet = fromRows(filtered, NOTIFICATION_COL_DEFS);

    return html`
      <div class="items-list">
        <pages-table
          .dataSet=${dataSet}
          .columnConfig=${NOTIFICATION_COL_CONFIG}
          .columnRenderers=${this._columnRenderers}
          .getRowKey=${(row: TypedRow) => row.text(N_ID_COL)}
          .getRowClass=${(row: TypedRow) => `severity-${row.text(N_SEVERITY_COL).toLowerCase()}`}
          mode="auto"
          selection="multi"
          client-sort
          .selectedKeys=${Array.from(this.selectedItems)}
          .hasMore=${this.nextCursor != null}
          @selection-change=${this._handleTableSelection}
          @row-activate=${this._handleTableActivate}
          @load-more=${this._handleLoadMore}
        ></pages-table>
      </div>
    `;
  }

  private renderBatchActionBar() {
    if (this.selectedItems.size < 2) return nothing;

    return html`
      <div class="batch-action-bar">
        <span class="batch-count">${this.selectedItems.size} selected</span>

        <button
          class="batch-button primary"
          @click="${this.handleBatchMarkRead}"
          ?disabled="${this.batchProcessing}"
        >
          ${this.batchProcessing ? 'Processing...' : 'Mark Read'}
        </button>

        <button
          class="batch-button danger"
          @click="${this.handleBatchDismiss}"
          ?disabled="${this.batchProcessing}"
        >
          ${this.batchProcessing ? 'Processing...' : 'Dismiss'}
        </button>

        <button
          class="batch-button secondary"
          @click="${this.handleClearSelection}"
          ?disabled="${this.batchProcessing}"
        >
          Clear
        </button>

        ${this.batchError
          ? html`<span class="batch-error">${this.batchError}</span>`
          : nothing}
      </div>
    `;
  }

  override render() {
    return html`
      <div class="inbox-container" aria-live="polite">
        ${this.renderTabs()}
        ${this.renderFilterBar()}
        ${this._actionError ? html`<div class="error-banner" role="alert">${this._actionError}</div>` : nothing}
        ${this.renderItems()}
        ${this.renderBatchActionBar()}
        <pages-confirm-dialog
          .open=${this._showDismissDialog}
          heading="Dismiss notifications?"
          message="This will dismiss ${this._pendingDismissItems.length} selected notification(s)."
          confirmLabel="Dismiss"
          cancelLabel="Keep"
          confirmVariant="danger"
          @confirm=${this._confirmBatchDismiss}
          @cancel=${() => { this._showDismissDialog = false; }}
        ></pages-confirm-dialog>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'blocks-notification-inbox': NotificationInbox;
  }
}
