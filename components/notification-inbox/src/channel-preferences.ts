import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { WorkIdentity } from '@casehubio/blocks-ui-core';
import '@casehubio/pages-form';
import type { FieldSchema } from '@casehubio/pages-form';
import type {
  DeliveryChannelDescriptor,
  NotificationPreferences,
  NotificationPreferenceUpdate,
  ChannelPreference,
  DigestSchedule,
} from './types.js';
import { NotificationApi } from './api.js';
import { emitNotificationEvent, NotificationEventTopics } from './events.js';

const SEVERITY_OPTIONS = [
  { const: 'INFO', title: 'Information' },
  { const: 'WARNING', title: 'Warning' },
  { const: 'URGENT', title: 'Urgent' },
] as const;

const SCHEDULE_TYPE_OPTIONS = [
  { const: 'interval', title: 'Interval' },
  { const: 'daily_at', title: 'Daily' },
  { const: 'weekly_at', title: 'Weekly' },
] as const;

const DAY_OPTIONS = [
  { const: 'MONDAY', title: 'Monday' },
  { const: 'TUESDAY', title: 'Tuesday' },
  { const: 'WEDNESDAY', title: 'Wednesday' },
  { const: 'THURSDAY', title: 'Thursday' },
  { const: 'FRIDAY', title: 'Friday' },
  { const: 'SATURDAY', title: 'Saturday' },
  { const: 'SUNDAY', title: 'Sunday' },
] as const;

const DELIVERY_MODE_OPTIONS = [
  { const: 'IMMEDIATE', title: 'Immediate' },
  { const: 'DIGEST', title: 'Digest' },
] as const;

const GROUP_BY_OPTIONS = [
  { const: 'FLAT', title: 'No grouping' },
  { const: 'CATEGORY', title: 'By category' },
  { const: 'ENTITY', title: 'By entity' },
] as const;

const QUIET_HOURS_ACTION_OPTIONS = [
  { const: 'SUPPRESS', title: 'Suppress entirely' },
  { const: 'BUFFER_FOR_DIGEST', title: 'Buffer for next digest' },
] as const;

interface ChannelFormData {
  enabled: boolean;
  minSeverity: string;
  deliveryMode: string;
  digestSchedule: {
    type: string;
    period: string;
    time: string;
    timezone: string;
    day: string;
  };
  groupBy: string;
}

interface FormData {
  [channelId: string]: ChannelFormData | {
    start: string;
    end: string;
    timezone: string;
    action: string;
  };
  quietHours: {
    start: string;
    end: string;
    timezone: string;
    action: string;
  };
}

@customElement('channel-preferences')
export class ChannelPreferences extends LitElement {
  @property({ type: String }) endpoint?: string;
  @property({ type: Object }) identity?: WorkIdentity;

  api?: NotificationApi;

  @state() loading = true;
  @state() error: string | null = null;
  @state() private _schema: FieldSchema | null = null;
  @state() private _formData: Record<string, unknown> = {};
  @state() private _saving = false;

  private _channels: DeliveryChannelDescriptor[] = [];
  private _preferences: NotificationPreferences | null = null;

  static override readonly styles = css`
    :host {
      display: block;
      font-family: var(--pages-font-family, system-ui);
    }
    .container { max-width: 640px; }
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
    .btn-clear {
      background: var(--pages-neutral-3, #f5f5f5);
      color: var(--pages-neutral-11, #555);
    }
    .btn-clear:hover { background: var(--pages-neutral-4, #eee); }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.endpoint != null && this.api == null) {
      this.api = new NotificationApi(this.endpoint);
    }
    this.fetchData();
  }

  private async fetchData(): Promise<void> {
    if (this.api == null) return;
    this.loading = true;
    this.error = null;
    try {
      const [channels, preferences] = await Promise.all([
        this.api.getChannels(),
        this.api.getPreferences(),
      ]);
      this._channels = [...channels];
      this._preferences = preferences;
      this.initForm();
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to load preferences';
    } finally {
      this.loading = false;
    }
  }

  private initForm(): void {
    const data: Record<string, unknown> = {};

    for (const ch of this._channels) {
      const pref = this._preferences?.channelDefaults[ch.channelId];
      const digestSchedule = pref?.digestSchedule ?? ch.defaultDigestSchedule;
      data[ch.channelId] = {
        enabled: pref?.enabled ?? ch.defaultEnabled,
        minSeverity: pref?.minSeverity ?? ch.defaultMinSeverity,
        deliveryMode: digestSchedule != null ? 'DIGEST' : 'IMMEDIATE',
        digestSchedule: {
          type: digestSchedule?.type ?? 'daily_at',
          period: digestSchedule?.type === 'interval' ? digestSchedule.period : 'PT1H',
          time: (digestSchedule as any)?.time ?? '09:00',
          timezone: (digestSchedule as any)?.timezone ?? 'UTC',
          day: (digestSchedule as any)?.day ?? 'MONDAY',
        },
        groupBy: pref?.groupBy ?? 'FLAT',
      };
    }

    const qh = this._preferences?.quietHours;
    data.quietHours = {
      start: qh?.start ?? '',
      end: qh?.end ?? '',
      timezone: qh?.timezone ?? 'UTC',
      action: qh?.action ?? 'SUPPRESS',
    };

    this._formData = data;
    this._schema = this.buildSchema();
  }

  private buildSchema(): FieldSchema {
    const properties: Record<string, FieldSchema> = {};

    for (const ch of this._channels) {
      properties[ch.channelId] = {
        type: 'object',
        title: ch.displayName,
        properties: {
          enabled: { type: 'boolean', title: 'Enabled' },
          minSeverity: { type: 'string', title: 'Minimum Severity', oneOf: [...SEVERITY_OPTIONS] },
          deliveryMode: { type: 'string', title: 'Delivery', oneOf: [...DELIVERY_MODE_OPTIONS] },
          digestSchedule: {
            type: 'object',
            title: 'Digest Schedule',
            properties: {
              type: { type: 'string', title: 'Frequency', oneOf: [...SCHEDULE_TYPE_OPTIONS] },
              period: { type: 'string', title: 'Period', description: 'ISO 8601 duration, e.g. PT1H', placeholder: 'PT1H' },
              time: { type: 'string', format: 'time', title: 'Time' },
              timezone: { type: 'string', title: 'Timezone', placeholder: 'UTC' },
              day: { type: 'string', title: 'Day of Week', oneOf: [...DAY_OPTIONS] },
            },
          },
          groupBy: { type: 'string', title: 'Group By', oneOf: [...GROUP_BY_OPTIONS] },
        },
      };
    }

    properties.quietHours = {
      type: 'object',
      title: 'Quiet Hours',
      properties: {
        start: { type: 'string', format: 'time', title: 'Start' },
        end: { type: 'string', format: 'time', title: 'End' },
        timezone: { type: 'string', title: 'Timezone', placeholder: 'UTC' },
        action: { type: 'string', title: 'During Quiet Hours', oneOf: [...QUIET_HOURS_ACTION_OPTIONS] },
      },
    };

    return { type: 'object', properties };
  }

  private handleFormChange(e: CustomEvent): void {
    this._formData = { ...e.detail.data };
  }

  async save(): Promise<void> {
    if (this.api == null) return;
    this._saving = true;
    try {
      const channelDefaults: Record<string, ChannelPreference> = {};

      for (const ch of this._channels) {
        const chData = this._formData[ch.channelId] as ChannelFormData;
        if (!chData) continue;

        let digestSchedule: DigestSchedule | null = null;
        if (chData.deliveryMode === 'DIGEST') {
          const ds = chData.digestSchedule;
          if (ds.type === 'interval') {
            digestSchedule = { type: 'interval', period: ds.period };
          } else if (ds.type === 'daily_at') {
            digestSchedule = { type: 'daily_at', time: ds.time, timezone: ds.timezone };
          } else if (ds.type === 'weekly_at') {
            digestSchedule = { type: 'weekly_at', day: ds.day, time: ds.time, timezone: ds.timezone };
          }
        }

        channelDefaults[ch.channelId] = {
          enabled: chData.enabled,
          minSeverity: chData.minSeverity as 'INFO' | 'WARNING' | 'URGENT',
          digestSchedule,
          groupBy: chData.deliveryMode === 'DIGEST' ? chData.groupBy as 'FLAT' | 'CATEGORY' | 'ENTITY' : undefined,
        };
      }

      const qh = this._formData.quietHours as { start: string; end: string; timezone: string; action: string };
      const update: NotificationPreferenceUpdate = {
        channelDefaults,
        quietHours: qh.start && qh.end ? {
          start: qh.start,
          end: qh.end,
          timezone: qh.timezone,
          action: qh.action as 'SUPPRESS' | 'BUFFER_FOR_DIGEST',
        } : undefined,
      };

      const result = await this.api.updatePreferences(update);
      this._preferences = result;

      emitNotificationEvent(this, NotificationEventTopics.PREFERENCE_UPDATED, {
        preferences: result,
      });
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to save preferences';
    } finally {
      this._saving = false;
    }
  }

  private clearQuietHours(): void {
    this._formData = {
      ...this._formData,
      quietHours: { start: '', end: '', timezone: 'UTC', action: 'SUPPRESS' },
    };
  }

  override render() {
    if (this.loading) {
      return html`<div class="loading">Loading preferences...</div>`;
    }
    if (this.error) {
      return html`<div class="error">${this.error}</div>`;
    }
    if (this._schema == null) return nothing;

    return html`
      <div class="container">
        <pages-schema-form
          .schema=${this._schema}
          .data=${this._formData}
          mode="edit"
          @pages-form-change=${this.handleFormChange}
        ></pages-schema-form>
        <div class="button-bar">
          <button class="btn-save" ?disabled=${this._saving} @click=${this.save}>
            ${this._saving ? 'Saving...' : 'Save Preferences'}
          </button>
          <button class="btn-clear" @click=${this.clearQuietHours}>Clear Quiet Hours</button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'channel-preferences': ChannelPreferences;
  }
}
