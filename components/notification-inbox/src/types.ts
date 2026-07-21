/**
 * TypeScript domain types for notification system. Translated from platform-api Java records.
 */

// Enums
export type NotificationStatus = 'UNREAD' | 'READ' | 'DISMISSED';
export type NotificationSeverity = 'INFO' | 'WARNING' | 'URGENT';
export type ConstraintOp = 'EQ' | 'NEQ' | 'GT' | 'LT' | 'GTE' | 'LTE' | 'IN' | 'STARTS_WITH' | 'CONTAINS';
export type TargetType = 'USER' | 'GROUP' | 'EVENT_FIELD' | 'ENTITY_WATCHERS';
export type MuteScope = 'ENTITY' | 'CATEGORY';

// Core notification types
export interface NotificationSource {
  readonly eventId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly actorId: string;
}

export interface Notification {
  readonly id: string;
  readonly userId: string;
  readonly tenancyId: string;
  readonly title: string;
  readonly body: string | null;
  readonly category: string;
  readonly severity: NotificationSeverity;
  readonly actionUrl: string | null;
  readonly source: NotificationSource;
  readonly status: NotificationStatus;
  readonly createdAt: string;
  readonly readAt: string | null;
  readonly dismissedAt: string | null;
}

export interface NotificationPage {
  readonly notifications: readonly Notification[];
  readonly nextCursor: string | null;
}

// Subscription types
export interface Constraint {
  readonly field: string;
  readonly op: ConstraintOp;
  readonly value: string;
}

export interface NotificationTarget {
  readonly type: TargetType;
  readonly id: string;
}

export interface NotificationTemplate {
  readonly titlePattern: string;
  readonly bodyPattern: string | null;
  readonly severity: NotificationSeverity;
  readonly category: string;
  readonly actionUrlPattern: string | null;
  readonly entityType: string;
  readonly entityIdField: string;
  readonly actorIdField: string;
}

export interface Subscription {
  readonly id: string;
  readonly ownerId: string;
  readonly tenancyId: string;
  readonly name: string;
  readonly eventType: string;
  readonly constraints: readonly Constraint[];
  readonly targets: readonly NotificationTarget[];
  readonly includeActor: boolean;
  readonly template: NotificationTemplate;
  readonly enabled: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SubscriptionPage {
  readonly subscriptions: readonly Subscription[];
  readonly nextCursor: string | null;
}

// Input types (for POST/PATCH)
export interface SubscriptionInput {
  readonly ownerId: string;
  readonly tenancyId: string;
  readonly name: string;
  readonly eventType: string;
  readonly constraints: readonly Constraint[];
  readonly targets: readonly NotificationTarget[];
  readonly includeActor: boolean;
  readonly template: NotificationTemplate;
  readonly enabled: boolean;
}

export interface SubscriptionUpdate {
  readonly name?: string;
  readonly eventType?: string;
  readonly constraints?: readonly Constraint[];
  readonly targets?: readonly NotificationTarget[];
  readonly includeActor?: boolean;
  readonly template?: NotificationTemplate;
  readonly enabled?: boolean;
}

// Suppression and preferences
export interface MuteRule {
  readonly id: string;
  readonly userId: string;
  readonly tenancyId: string;
  readonly scope: MuteScope;
  readonly scopeId: string;
  readonly entityType: string | null;
  readonly createdAt: string;
  readonly expiresAt: string | null;
}

export interface MuteRuleInput {
  readonly userId: string;
  readonly tenancyId: string;
  readonly scope: MuteScope;
  readonly scopeId: string;
  readonly entityType?: string | null;
  readonly expiresAt?: string | null;
}

export interface Snooze {
  readonly userId: string;
  readonly tenancyId: string;
  readonly until: string;
  readonly createdAt: string;
}

export interface SnoozeInput {
  readonly userId: string;
  readonly tenancyId: string;
  readonly until: string;
}

// Digest schedule types
export type DigestSchedule = DigestScheduleInterval | DigestScheduleDailyAt | DigestScheduleWeeklyAt;

export interface DigestScheduleInterval {
  readonly type: 'interval';
  readonly period: string; // ISO 8601 duration
}

export interface DigestScheduleDailyAt {
  readonly type: 'daily_at';
  readonly time: string; // HH:mm format
  readonly timezone: string;
}

export interface DigestScheduleWeeklyAt {
  readonly type: 'weekly_at';
  readonly day: string;
  readonly time: string;
  readonly timezone: string;
}

export type DigestGroupBy = 'FLAT' | 'CATEGORY' | 'ENTITY';

export type QuietHoursAction = 'SUPPRESS' | 'BUFFER_FOR_DIGEST';

export interface ChannelPreference {
  readonly enabled: boolean;
  readonly minSeverity: NotificationSeverity;
  readonly digestSchedule: DigestSchedule | null;
  readonly groupBy?: DigestGroupBy;
}

export interface QuietHours {
  readonly start: string;
  readonly end: string;
  readonly timezone: string;
  readonly action?: QuietHoursAction;
}

export interface NotificationPreferences {
  readonly userId: string;
  readonly tenancyId: string;
  readonly channelDefaults: Record<string, ChannelPreference>;
  readonly quietHours: QuietHours | null;
  readonly updatedAt: string;
}

export interface NotificationPreferenceUpdate {
  readonly channelDefaults?: Record<string, ChannelPreference>;
  readonly quietHours?: QuietHours | null;
  readonly clearQuietHours?: boolean;
}

// Delivery channel descriptor
export interface DeliveryChannelDescriptor {
  readonly channelId: string;
  readonly displayName: string;
  readonly external: boolean;
  readonly defaultEnabled: boolean;
  readonly defaultMinSeverity: NotificationSeverity;
  readonly defaultDigestSchedule: DigestSchedule | null;
}

// Event type descriptors (for subscription editor's event type picker)
export interface EventFieldDescriptor {
  readonly name: string;
  readonly type: string;
  readonly description: string;
}

export interface EventTypeDescriptor {
  readonly eventType: string;
  readonly displayName: string;
  readonly description: string;
  readonly fields: readonly EventFieldDescriptor[];
}

// SSE event types
export type SSENotificationEventType = 'notification' | 'notification-updated' | 'unread-count';

export interface SSENotificationEvent {
  readonly type: SSENotificationEventType;
  readonly data: unknown;
}
