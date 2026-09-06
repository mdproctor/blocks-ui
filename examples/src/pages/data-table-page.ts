import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import type { WorkItemResponse } from '@casehubio/blocks-ui-core';
import { formatTimestamp } from '@casehubio/blocks-ui-core';
import type { TableColumnConfig, ColumnRenderer, SelectionChangeDetail, RowActivateDetail } from '@casehubio/pages-table';
import '@casehubio/pages-table';
import { fromRows } from '@casehubio/pages-data/dist/dataset/conversion.js';
import { columnId, ColumnType } from '@casehubio/pages-data/dist/dataset/types.js';
import type { CellValue, ColumnId, TypedRow } from '@casehubio/pages-data/dist/dataset/types.js';

interface WorkItemRootResponse {
  item: WorkItemResponse;
  childCount: number;
  completedCount: number | null;
  requiredCount: number | null;
  groupStatus: string | null;
}



@customElement('blocks-example-data-table')
export class DataTablePage extends LitElement {
  @state() private items: WorkItemRootResponse[] = [];
  @state() private selectedKeys: string[] = [];
  @state() private lastActivated: string = '';

  private colDefs = [
    { id: columnId('id'), type: ColumnType.TEXT, getValue: (r: WorkItemRootResponse) => r.item.id },
    { id: columnId('title'), name: 'Title', type: ColumnType.TEXT, getValue: (r: WorkItemRootResponse) => r.item.title },
    { id: columnId('status'), name: 'Status', type: ColumnType.TEXT, getValue: (r: WorkItemRootResponse) => r.item.status },
    { id: columnId('priority'), name: 'Priority', type: ColumnType.TEXT, getValue: (r: WorkItemRootResponse) => r.item.priority },
    { id: columnId('category'), name: 'Category', type: ColumnType.TEXT, getValue: (r: WorkItemRootResponse) => r.item.category ?? '—' },
    { id: columnId('assignee'), name: 'Assignee', type: ColumnType.TEXT, getValue: (r: WorkItemRootResponse) => r.item.assigneeId ?? 'Unassigned' },
    { id: columnId('created'), name: 'Age', type: ColumnType.TEXT, getValue: (r: WorkItemRootResponse) => r.item.createdAt },
  ] as const;

  private colConfig: readonly TableColumnConfig[] = [
    { id: columnId('id'), visible: false },
    { id: columnId('title'), sortable: true, width: '2fr' },
    { id: columnId('status'), sortable: true, width: '120px' },
    { id: columnId('priority'), sortable: true, width: '100px' },
    { id: columnId('category'), sortable: true, width: '140px' },
    { id: columnId('assignee'), sortable: true, width: '120px' },
    { id: columnId('created'), sortable: true, width: '80px' },
  ];

  private renderers: ReadonlyMap<ColumnId, ColumnRenderer> = new Map([
    [columnId('status'), (cell: CellValue) => {
      const v = cell.type === 'NULL' ? '' : (cell as { value: string }).value;
      return html`<span style="
        display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px;
        font-weight: 500; text-transform: uppercase; letter-spacing: 0.02em;
        background: var(--pages-neutral-4, #e5e5e5); color: var(--pages-neutral-11, #666);
      ">${v}</span>`;
    }],
    [columnId('created'), (cell: CellValue) => {
      if (cell.type === 'NULL') return '';
      return formatTimestamp((cell as { value: string }).value, { style: 'compact' });
    }],
  ]);

  static override styles = css`
    :host { display: block; padding: 24px; }
    h2 { margin-bottom: 8px; font-size: 20px; font-weight: 600; color: var(--pages-neutral-12, #111); }
    p { margin-bottom: 16px; color: var(--pages-neutral-11, #555); font-size: 14px; }
    .demo-section { margin-bottom: 32px; }
    .demo-section h3 { margin-bottom: 8px; font-size: 16px; font-weight: 500; color: var(--pages-neutral-12, #111); }
    .table-container {
      border: 1px solid var(--pages-neutral-5, #e0e0e0);
      border-radius: 8px; overflow: hidden; height: 500px;
    }
    .status-bar {
      padding: 8px 16px; font-size: 12px; color: var(--pages-neutral-9, #888);
      border-top: 1px solid var(--pages-neutral-5, #e0e0e0);
      background: var(--pages-neutral-2, #fafafa);
    }
    pages-table::part(row) {
      border-left: 3px solid transparent;
    }
    pages-table::part(priority-urgent) {
      border-left-color: var(--pages-danger-9, #dc2626);
    }
    pages-table::part(priority-high) {
      border-left-color: var(--pages-warning-9, #d97706);
    }
    pages-table::part(priority-medium) {
      border-left-color: var(--pages-accent-9, #2563eb);
    }
    pages-table::part(priority-low) {
      border-left-color: var(--pages-neutral-7, #a3a3a3);
    }
  `;

  override async connectedCallback() {
    super.connectedCallback();
    const resp = await fetch('/workitems/inbox');
    const data = await resp.json();
    this.items = data as WorkItemRootResponse[];
  }

  private handleSelection(e: CustomEvent<SelectionChangeDetail>) {
    this.selectedKeys = [...e.detail.selectedKeys];
  }

  private handleActivate(e: CustomEvent<RowActivateDetail>) {
    const row = e.detail.row;
    this.lastActivated = row.text(columnId('title'));
  }

  override render() {
    return html`
      <h2>Data Table</h2>
      <p>Generic data table with configurable columns, three display modes, multi-select, sorting, and column visibility.
         Uses CSS Grid rendering and virtual scrolling. Keyboard navigable (arrows, Enter, Space, Escape).</p>

      <div class="demo-section">
        <div class="table-container">
          <pages-table
            .dataSet=${fromRows(this.items, this.colDefs)}
            .columnConfig=${this.colConfig}
            .columnRenderers=${this.renderers}
            .getRowKey=${(r: TypedRow) => r.text(columnId('id'))}
            .getRowClass=${(r: TypedRow) => 'priority-' + r.text(columnId('priority')).toLowerCase()}
            mode="auto"
            .pageSize=${10}
            selection="multi"
            .selectedKeys=${this.selectedKeys}
            client-sort
            @selection-change=${this.handleSelection}
            @row-activate=${this.handleActivate}
          ></pages-table>
        </div>

        <div class="status-bar">
          ${this.selectedKeys.length > 0
            ? `${this.selectedKeys.length} row(s) selected`
            : 'No selection'}
          ${this.lastActivated ? ` — Last activated: ${this.lastActivated}` : ''}
          — ${this.items.length} total rows
          — Mode: ${this.currentMode}
        </div>
      </div>
    `;
  }
}
