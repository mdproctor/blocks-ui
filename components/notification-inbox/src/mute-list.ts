import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { WorkIdentity } from '@casehubio/blocks-ui-core';
import { BlocksConfirmDialog } from '@casehubio/blocks-ui-core';
import '@casehubio/pages-form';
import '@casehubio/pages-table';
import type { TableColumnConfig, ColumnRenderer } from '@casehubio/pages-table';
import { fromRows } from '@casehubio/pages-data/dist/dataset/conversion.js';
import { columnId, ColumnType } from '@casehubio/pages-data/dist/dataset/types.js';
import type { CellValue, ColumnId, TypedRow } from '@casehubio/pages-data/dist/dataset/types.js';
import type { FieldSchema } from '@casehubio/pages-form';
import type { MuteRule, MuteRuleInput } from './types.js';
import { NotificationApi } from './api.js';
import { emitNotificationEvent, NotificationEventTopics } from './events.js';

const M_ID_COL = columnId('id');
const M_SCOPE_COL = columnId('scope');
const M_SCOPE_ID_COL = columnId('scopeId');
const M_ENTITY_TYPE_COL = columnId('entityType');
const M_EXPIRES_COL = columnId('expiresAt');
const M_ACTIONS_COL = columnId('actions');

const MUTE_COL_DEFS = [
  { id: M_ID_COL, type: ColumnType.TEXT, getValue: (r: MuteRule) => r.id },
  { id: M_SCOPE_COL, name: 'Scope', type: ColumnType.TEXT, getValue: (r: MuteRule) => r.scope },
  { id: M_SCOPE_ID_COL, name: 'Target', type: ColumnType.TEXT, getValue: (r: MuteRule) => r.scopeId },
  { id: M_ENTITY_TYPE_COL, name: 'Entity Type', type: ColumnType.TEXT, getValue: (r: MuteRule) => r.entityType ?? '' },
  { id: M_EXPIRES_COL, name: 'Expires', type: ColumnType.TEXT, getValue: (r: MuteRule) => r.expiresAt ?? '' },
  { id: M_ACTIONS_COL, type: ColumnType.TEXT, getValue: () => '' },
] as const;

const MUTE_COL_CONFIG: readonly TableColumnConfig[] = [
  { id: M_ID_COL, visible: false },
  { id: M_SCOPE_COL, sortable: true, width: '100px' },
  { id: M_SCOPE_ID_COL, sortable: true, width: '1fr' },
  { id: M_ENTITY_TYPE_COL, sortable: true, width: '120px' },
  { id: M_EXPIRES_COL, sortable: true, width: '160px' },
  { id: M_ACTIONS_COL, sortable: false, width: '80px' },
];

const ADD_SCHEMA: FieldSchema = {
  type: 'object',
  properties: {
    scope: {
      type: 'string',
      title: 'Scope',
      oneOf: [
        { const: 'ENTITY', title: 'Entity' },
        { const: 'CATEGORY', title: 'Category' },
      ],
    },
    scopeId: { type: 'string', title: 'Target ID', placeholder: 'Entity or category identifier' },
    entityType: { type: 'string', title: 'Entity Type', placeholder: 'e.g. issue, pr' },
    expiresAt: { type: 'string', format: 'date-time', title: 'Expires At' },
  },
  required: ['scope', 'scopeId'],
};

@customElement('mute-list')
export class MuteList extends LitElement {
  @property({ type: String }) endpoint?: string;
  @property({ type: Object }) identity?: WorkIdentity;

  api?: NotificationApi;

  @state() loading = true;
  @state() error: string | null = null;
  @state() rules: MuteRule[] = [];
  @state() showAddForm = false;
  @state() addFormData: Record<string, string> = { scope: '', scopeId: '', entityType: '', expiresAt: '' };
  @state() private _showRemoveDialog = false;
  @state() private _pendingRemoveId: string | null = null;

  private _columnRenderers: ReadonlyMap<ColumnId, ColumnRenderer> = new Map<ColumnId, ColumnRenderer>([
    [M_SCOPE_COL, (cell: CellValue) => {
      if (cell.type === 'NULL') return '';
      const scope = (cell as { value: string }).value;
      return html`<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:12px;font-weight:500;background:var(--pages-accent-3,#cce5ff);color:var(--pages-accent-11,#0066cc)">${scope}</span>`;
    }],
    [M_EXPIRES_COL, (cell: CellValue) => {
      if (cell.type === 'NULL' || !(cell as { value: string }).value) return html`<span style="color:var(--pages-neutral-9,#737373)">Never</span>`;
      return html`${new Date((cell as { value: string }).value).toLocaleDateString()}`;
    }],
    [M_ACTIONS_COL, (_cell: CellValue, row: TypedRow) => {
      const id = row.text(M_ID_COL);
      return html`<button style="padding:4px 12px;border:none;border-radius:4px;font-size:13px;font-weight:500;cursor:pointer;background:var(--pages-danger-3,#fee);color:var(--pages-danger-11,#c00)" @click=${(e: Event) => { e.stopPropagation(); this.handleRemove(id); }}>Remove</button>`;
    }],
  ]);

  static override readonly styles = css`
    :host {
      display: block;
      font-family: var(--pages-font-family, system-ui);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .btn-add {
      padding: 6px 14px;
      background: var(--pages-accent-9, #0080ff);
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }
    .btn-add:hover { background: var(--pages-accent-10, #0066cc); }
    .add-form {
      border: 1px solid var(--pages-neutral-6, #e0e0e0);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      background: var(--pages-neutral-2, #fafafa);
    }
    .add-form-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }
    .add-form-actions button {
      padding: 6px 14px;
      border: none;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }
    .btn-submit {
      background: var(--pages-accent-9, #0080ff);
      color: white;
    }
    .btn-cancel {
      background: var(--pages-neutral-3, #f5f5f5);
      color: var(--pages-neutral-11, #555);
    }
    .loading {
      padding: 24px;
      color: var(--pages-neutral-9, #737373);
      text-align: center;
    }
    .error {
      padding: 16px;
      background: var(--pages-danger-3, #fee);
      color: var(--pages-danger-11, #c00);
      border-radius: 4px;
    }
    .empty {
      padding: 24px;
      color: var(--pages-neutral-9, #737373);
      text-align: center;
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.endpoint != null && this.api == null) {
      this.api = new NotificationApi(this.endpoint);
    }
    this.fetchRules();
  }

  private async fetchRules(): Promise<void> {
    if (this.api == null) return;
    this.loading = true;
    this.error = null;
    try {
      this.rules = [...await this.api.listMuteRules()] as MuteRule[];
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to load mute rules';
    } finally {
      this.loading = false;
    }
  }

  handleRemove(ruleId: string): void {
    this._pendingRemoveId = ruleId;
    this._showRemoveDialog = true;
  }

  async confirmRemove(): Promise<void> {
    if (this.api == null || this._pendingRemoveId == null) return;
    const id = this._pendingRemoveId;
    this._showRemoveDialog = false;
    this._pendingRemoveId = null;

    try {
      await this.api.removeMuteRule(id);
      this.rules = this.rules.filter(r => r.id !== id);
      emitNotificationEvent(this, NotificationEventTopics.MUTE_DELETED, { ruleId: id });
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to remove mute rule';
    }
  }

  async submitAdd(): Promise<void> {
    if (this.api == null) return;
    try {
      const input: MuteRuleInput = {
        userId: this.identity?.userId ?? '',
        tenancyId: this.identity?.tenancyId ?? '',
        scope: this.addFormData.scope as 'ENTITY' | 'CATEGORY',
        scopeId: this.addFormData.scopeId,
        entityType: this.addFormData.entityType || undefined,
        expiresAt: this.addFormData.expiresAt || undefined,
      };
      const rule = await this.api.addMuteRule(input);
      this.rules = [...this.rules, rule as MuteRule];
      this.showAddForm = false;
      this.addFormData = { scope: '', scopeId: '', entityType: '', expiresAt: '' };
      emitNotificationEvent(this, NotificationEventTopics.MUTE_CREATED, { rule });
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to add mute rule';
    }
  }

  private handleAddFormChange(e: CustomEvent): void {
    this.addFormData = { ...e.detail.data };
  }

  override render() {
    if (this.loading) {
      return html`<div class="loading">Loading mute rules...</div>`;
    }
    if (this.error) {
      return html`<div class="error">${this.error}</div>`;
    }

    return html`
      <div class="header">
        <span></span>
        <button class="btn-add" @click=${() => { this.showAddForm = true; }}>Add Mute Rule</button>
      </div>

      ${this.showAddForm ? html`
        <div class="add-form">
          <pages-schema-form
            .schema=${ADD_SCHEMA}
            .data=${this.addFormData}
            mode="edit"
            @pages-form-change=${this.handleAddFormChange}
          ></pages-schema-form>
          <div class="add-form-actions">
            <button class="btn-submit" @click=${this.submitAdd}>Add</button>
            <button class="btn-cancel" @click=${() => { this.showAddForm = false; }}>Cancel</button>
          </div>
        </div>
      ` : nothing}

      ${this.rules.length === 0
        ? html`<div class="empty">No active mute rules.</div>`
        : html`
          <pages-table
            .dataSet=${fromRows(this.rules, MUTE_COL_DEFS)}
            .columnConfig=${MUTE_COL_CONFIG}
            .columnRenderers=${this._columnRenderers}
            .getRowKey=${(row: TypedRow) => row.text(M_ID_COL)}
            mode="scroll"
            selection="none"
          ></pages-table>
        `
      }

      <blocks-confirm-dialog
        .open=${this._showRemoveDialog}
        heading="Remove mute rule?"
        message="This mute rule will be removed and notifications will resume."
        confirmLabel="Remove"
        cancelLabel="Keep"
        confirmVariant="danger"
        @confirm=${this.confirmRemove}
        @cancel=${() => { this._showRemoveDialog = false; this._pendingRemoveId = null; }}
      ></blocks-confirm-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mute-list': MuteList;
  }
}
