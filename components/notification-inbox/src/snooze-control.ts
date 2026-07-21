import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { WorkIdentity } from '@casehubio/blocks-ui-core';
import '@casehubio/pages-form';
import type { FieldSchema } from '@casehubio/pages-form';
import type { Snooze } from './types.js';
import { NotificationApi } from './api.js';
import { emitNotificationEvent, NotificationEventTopics } from './events.js';

const SNOOZE_SCHEMA: FieldSchema = {
  type: 'object',
  properties: {
    until: { type: 'string', format: 'date-time', title: 'Snooze Until' },
  },
  required: ['until'],
};

@customElement('snooze-control')
export class SnoozeControl extends LitElement {
  @property({ type: String }) endpoint?: string;
  @property({ type: Object }) identity?: WorkIdentity;

  api?: NotificationApi;

  @state() loading = true;
  @state() error: string | null = null;
  @state() snoozeUntil = '';
  @state() private _snooze: Snooze | null = null;
  @state() private _processing = false;

  static override readonly styles = css`
    :host {
      display: block;
      font-family: var(--pages-font-family, system-ui);
    }
    .container { max-width: 400px; }
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
    .snoozed {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      background: var(--pages-warning-3, #fff3cd);
      border: 1px solid var(--pages-warning-6, #d97706);
      border-radius: 8px;
    }
    .snoozed-label {
      font-weight: 500;
      color: var(--pages-warning-11, #856404);
    }
    .activate-bar {
      margin-top: 12px;
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
    .btn-activate {
      background: var(--pages-accent-9, #0080ff);
      color: white;
    }
    .btn-activate:hover { background: var(--pages-accent-10, #0066cc); }
    .btn-activate:disabled {
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
    this.fetchSnooze();
  }

  private async fetchSnooze(): Promise<void> {
    if (this.api == null) return;
    this.loading = true;
    this.error = null;
    try {
      this._snooze = await this.api.getSnooze();
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to load snooze state';
    } finally {
      this.loading = false;
    }
  }

  async activate(): Promise<void> {
    if (this.api == null || !this.snoozeUntil) return;
    this._processing = true;
    try {
      this._snooze = await this.api.activateSnooze(this.snoozeUntil);
      this.snoozeUntil = '';
      emitNotificationEvent(this, NotificationEventTopics.SNOOZE_ACTIVATED, {
        snooze: this._snooze,
      });
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to activate snooze';
    } finally {
      this._processing = false;
    }
  }

  async cancelSnooze(): Promise<void> {
    if (this.api == null) return;
    this._processing = true;
    try {
      await this.api.cancelSnooze();
      this._snooze = null;
      emitNotificationEvent(this, NotificationEventTopics.SNOOZE_CANCELLED, {});
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to cancel snooze';
    } finally {
      this._processing = false;
    }
  }

  private handleFormChange(e: CustomEvent): void {
    this.snoozeUntil = e.detail.data.until ?? '';
  }

  override render() {
    if (this.loading) {
      return html`<div class="loading">Loading snooze state...</div>`;
    }
    if (this.error) {
      return html`<div class="error">${this.error}</div>`;
    }

    if (this._snooze) {
      return html`
        <div class="snoozed">
          <span class="snoozed-label">Snoozed until ${new Date(this._snooze.until).toLocaleString()}</span>
          <button class="btn-cancel" ?disabled=${this._processing} @click=${this.cancelSnooze}>Cancel</button>
        </div>
      `;
    }

    return html`
      <div class="container">
        <pages-schema-form
          .schema=${SNOOZE_SCHEMA}
          .data=${{ until: this.snoozeUntil }}
          mode="edit"
          @pages-form-change=${this.handleFormChange}
        ></pages-schema-form>
        <div class="activate-bar">
          <button class="btn-activate" ?disabled=${this._processing || !this.snoozeUntil} @click=${this.activate}>
            ${this._processing ? 'Activating...' : 'Activate Snooze'}
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'snooze-control': SnoozeControl;
  }
}
