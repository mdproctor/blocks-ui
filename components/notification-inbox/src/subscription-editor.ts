import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { WorkIdentity } from '@casehubio/blocks-ui-core';
import '@casehubio/pages-form';
import type { FieldSchema } from '@casehubio/pages-form';
import type {
  Subscription,
  SubscriptionInput,
  SubscriptionUpdate,
  EventTypeDescriptor,
  Constraint,
  NotificationTarget,
  NotificationTemplate,
} from './types.js';
import { NotificationApi } from './api.js';
import { emitNotificationEvent, NotificationEventTopics } from './events.js';

const OP_OPTIONS: readonly { readonly const: string; readonly title: string }[] = [
  { const: 'EQ', title: 'Equals' },
  { const: 'NEQ', title: 'Not equals' },
  { const: 'GT', title: 'Greater than' },
  { const: 'LT', title: 'Less than' },
  { const: 'GTE', title: 'Greater or equal' },
  { const: 'LTE', title: 'Less or equal' },
  { const: 'IN', title: 'In list' },
  { const: 'STARTS_WITH', title: 'Starts with' },
  { const: 'CONTAINS', title: 'Contains' },
];

const TARGET_TYPE_OPTIONS: readonly { readonly const: string; readonly title: string }[] = [
  { const: 'USER', title: 'User' },
  { const: 'GROUP', title: 'Group' },
  { const: 'EVENT_FIELD', title: 'Event Field' },
  { const: 'ENTITY_WATCHERS', title: 'Entity Watchers' },
];

const SEVERITY_OPTIONS: readonly { readonly const: string; readonly title: string }[] = [
  { const: 'INFO', title: 'Information' },
  { const: 'WARNING', title: 'Warning' },
  { const: 'URGENT', title: 'Urgent' },
];

interface SubscriptionFormData {
  name: string;
  eventType: string;
  constraints: Constraint[];
  targets: NotificationTarget[];
  includeActor: boolean;
  template: NotificationTemplate;
}

@customElement('subscription-editor')
export class SubscriptionEditor extends LitElement {
  @property({ type: String }) endpoint?: string;
  @property({ type: Object }) identity?: WorkIdentity;
  @property({ type: Object }) subscription?: Subscription;

  api?: NotificationApi;

  @state() loading = true;
  @state() error: string | null = null;
  @state() formData: SubscriptionFormData | null = null;
  @state() private _schema: FieldSchema | null = null;
  @state() private _saving = false;
  @state() private _saveError: string | null = null;

  private _eventTypes: EventTypeDescriptor[] = [];

  static override readonly styles = css`
    :host {
      display: block;
      font-family: var(--pages-font-family, system-ui);
    }
    .editor-container {
      max-width: 640px;
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
    .save-error {
      padding: 12px 16px;
      background: var(--pages-danger-3, #fee);
      color: var(--pages-danger-11, #c00);
      border-radius: 4px;
      margin-bottom: 12px;
    }
    .button-bar {
      display: flex;
      gap: 8px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--pages-neutral-6, #e0e0e0);
    }
    button {
      padding: 8px 20px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
    }
    .btn-save {
      background: var(--pages-accent-9, #0080ff);
      color: white;
    }
    .btn-save:hover { background: var(--pages-accent-10, #0066cc); }
    .btn-save:disabled {
      background: var(--pages-neutral-6, #a3a3a3);
      cursor: not-allowed;
    }
    .btn-cancel {
      background: var(--pages-neutral-3, #f5f5f5);
      color: var(--pages-neutral-11, #555);
    }
    .btn-cancel:hover { background: var(--pages-neutral-4, #eee); }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.endpoint != null && this.api == null) {
      this.api = new NotificationApi(this.endpoint);
    }
    this.fetchEventTypes();
  }

  private async fetchEventTypes(): Promise<void> {
    if (this.api == null) return;
    this.loading = true;
    this.error = null;
    try {
      this._eventTypes = [...await this.api.getEventTypes()];
      this.initForm();
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to load event types';
    } finally {
      this.loading = false;
    }
  }

  private initForm(): void {
    if (this.subscription) {
      this.formData = {
        name: this.subscription.name,
        eventType: this.subscription.eventType,
        constraints: [...this.subscription.constraints] as Constraint[],
        targets: [...this.subscription.targets] as NotificationTarget[],
        includeActor: this.subscription.includeActor,
        template: { ...this.subscription.template },
      };
    } else {
      this.formData = {
        name: '',
        eventType: '',
        constraints: [],
        targets: [],
        includeActor: false,
        template: {
          titlePattern: '',
          bodyPattern: null,
          severity: 'INFO',
          category: '',
          actionUrlPattern: null,
          entityType: '',
          entityIdField: '',
          actorIdField: '',
        },
      };
    }
    this._schema = this.buildSchema(this.formData.eventType);
  }

  private buildSchema(eventType?: string): FieldSchema {
    const eventTypeOptions = this._eventTypes.map(et => ({
      const: et.eventType,
      title: et.displayName,
    }));

    const selectedType = eventType
      ? this._eventTypes.find(et => et.eventType === eventType)
      : undefined;

    const fieldOptions = selectedType
      ? selectedType.fields.map(f => ({ const: f.name, title: `${f.name} (${f.type})` }))
      : [];

    return {
      type: 'object',
      properties: {
        name: { type: 'string', title: 'Name', placeholder: 'Subscription name' },
        eventType: { type: 'string', title: 'Event Type', oneOf: eventTypeOptions },
        constraints: {
          type: 'array',
          title: 'Filters',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string', title: 'Field', oneOf: fieldOptions.length > 0 ? fieldOptions : undefined },
              op: { type: 'string', title: 'Operator', oneOf: OP_OPTIONS as { const: string; title: string }[] },
              value: { type: 'string', title: 'Value' },
            },
            required: ['field', 'op', 'value'],
          },
        },
        targets: {
          type: 'array',
          title: 'Targets',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', title: 'Type', oneOf: TARGET_TYPE_OPTIONS as { const: string; title: string }[] },
              id: { type: 'string', title: 'ID', placeholder: 'Target identifier' },
            },
            required: ['type'],
          },
        },
        includeActor: { type: 'boolean', title: 'Include Actor' },
        template: {
          type: 'object',
          title: 'Notification Template',
          properties: {
            titlePattern: { type: 'string', title: 'Title Pattern', description: 'Use ${fieldName} for interpolation' },
            bodyPattern: { type: 'string', title: 'Body Pattern', description: 'Use ${fieldName} for interpolation' },
            severity: { type: 'string', title: 'Severity', oneOf: SEVERITY_OPTIONS as { const: string; title: string }[] },
            category: { type: 'string', title: 'Category' },
            actionUrlPattern: { type: 'string', title: 'Action URL Pattern', description: 'Use ${fieldName} for interpolation' },
            entityType: { type: 'string', title: 'Entity Type' },
            entityIdField: {
              type: 'string',
              title: 'Entity ID Field',
              oneOf: fieldOptions.length > 0 ? fieldOptions : undefined,
            },
            actorIdField: {
              type: 'string',
              title: 'Actor ID Field',
              oneOf: fieldOptions.length > 0 ? fieldOptions : undefined,
            },
          },
          required: ['titlePattern', 'severity', 'category', 'entityType', 'entityIdField', 'actorIdField'],
        },
      },
      required: ['name', 'eventType'],
    };
  }

  handleFormChange(e: CustomEvent): void {
    const { key, value, data } = e.detail;
    this.formData = { ...data } as SubscriptionFormData;

    if (key === 'eventType') {
      this._schema = this.buildSchema(value as string);
      this.formData = { ...this.formData, constraints: [] };
    }
  }

  async save(): Promise<void> {
    if (this.api == null || this.formData == null) return;

    this._saving = true;
    this._saveError = null;

    try {
      if (this.subscription) {
        const update: SubscriptionUpdate = {
          name: this.formData.name,
          eventType: this.formData.eventType,
          constraints: this.formData.constraints,
          targets: this.formData.targets,
          includeActor: this.formData.includeActor,
          template: this.formData.template,
        };
        await this.api.updateSubscription(this.subscription.id, update);
      } else {
        const input: SubscriptionInput = {
          ownerId: this.identity?.userId ?? '',
          tenancyId: this.identity?.tenancyId ?? '',
          name: this.formData.name,
          eventType: this.formData.eventType,
          constraints: this.formData.constraints,
          targets: this.formData.targets,
          includeActor: this.formData.includeActor,
          template: this.formData.template,
          enabled: true,
        };
        await this.api.createSubscription(input);
      }

      emitNotificationEvent(this, NotificationEventTopics.SUBSCRIPTION_CREATED, {
        name: this.formData.name,
        eventType: this.formData.eventType,
      });
      this.dispatchEvent(new Event('save'));
    } catch (e) {
      this._saveError = e instanceof Error ? e.message : 'Failed to save subscription';
    } finally {
      this._saving = false;
    }
  }

  cancel(): void {
    this.dispatchEvent(new Event('cancel'));
  }

  override render() {
    if (this.loading) {
      return html`<div class="loading">Loading event types...</div>`;
    }

    if (this.error) {
      return html`<div class="error">${this.error}</div>`;
    }

    if (this._schema == null || this.formData == null) {
      return nothing;
    }

    return html`
      <div class="editor-container">
        ${this._saveError ? html`<div class="save-error">${this._saveError}</div>` : nothing}
        <pages-schema-form
          .schema=${this._schema}
          .data=${this.formData}
          mode="edit"
          validateOnBlur
          @pages-form-change=${this.handleFormChange}
        ></pages-schema-form>
        <div class="button-bar">
          <button class="btn-save" ?disabled=${this._saving} @click=${this.save}>
            ${this._saving ? 'Saving...' : (this.subscription ? 'Update' : 'Create')}
          </button>
          <button class="btn-cancel" @click=${this.cancel}>Cancel</button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'subscription-editor': SubscriptionEditor;
  }
}
