# Subscription Editor & Notification Preferences Design

**Issues:** #33 (subscription editor), #34 (notification preferences/suppression UI)
**Branch:** `issue-33-subscription-editor`
**Date:** 2026-07-21

---

## Overview

Two sets of UI components for the notification system:

1. **Subscription editor** — form for creating/editing notification subscriptions, embedded in the existing `SubscriptionList` component
2. **Notification preferences** — channel delivery settings, mute rule management, and snooze control

Both use `<pages-schema-form>` from `@casehubio/pages-form` for form rendering. Four schema improvements are needed in pages-form to support these components.

---

## Part 1: Schema Improvements (pages-form)

Four changes to `FieldSchema` in `packages/pages-form/src/types.ts`:

### 1.1 Labeled enums via `oneOf`

Add `oneOf` to `FieldSchema`:

```typescript
readonly oneOf?: readonly { readonly const: string; readonly title: string }[];
```

When `oneOf` is present, `renderEditField` renders a `<select>` using `title` as display text and `const` as the value. When the current value doesn't match any `const` (including null/undefined/empty — typical in create mode), an initial disabled placeholder option is rendered: `<option value="" disabled selected>Select {title}...</option>`. This prevents accidental submission with an unintended default. Follows the JSON Schema spec. Existing `enum` stays for simple cases where value = label. When both `oneOf` and `enum` are present on a field, `oneOf` takes priority — the `enum` values are ignored for rendering and validation.

In `renderDisplayField`, look up the matching `title` for the current value and display that instead of the raw value.

Validation: when `oneOf` is present and the field is required, validate that the value matches one of the `const` values.

Example:
```typescript
{
  type: 'string',
  title: 'Operator',
  oneOf: [
    { const: 'EQ', title: 'Equals' },
    { const: 'NEQ', title: 'Not equals' },
    { const: 'CONTAINS', title: 'Contains' },
  ]
}
```

### 1.2 `format: 'time'`

Renders `<input type="time">` for HH:mm values. One new case in `renderEditField` (after the existing `date-time` case) and `renderDisplayField`. Follows the existing `date` / `date-time` pattern.

### 1.3 `readOnly: boolean`

Add to `FieldSchema`:

```typescript
readonly readOnly?: boolean;
```

When true in edit mode, renders the input with the `readonly` attribute. The existing CSS already styles read-only inputs (`input:read-only { background: ...; cursor: not-allowed; }`).

`validateField` checks `schema.readOnly` internally — when true, it returns null (valid) without evaluating other constraints. No signature change needed; the schema already carries the flag.

### 1.4 Recursive validation for nested objects and arrays

`validateField` currently only validates top-level properties. Extend it to recurse:

- **Nested objects** (`schema.type === 'object'` with `schema.properties`): iterate sub-properties, validate each against its sub-schema and the nested `required` set. Return the first error as `"{subField}: {error}"`.
- **Arrays** (`schema.type === 'array'` with `schema.items`): validate each item. For object items with sub-properties, validate each sub-property. Return the first error as `"Item {n}: {subField}: {error}"`.

The `submit()` method's top-level validation loop is unchanged — `validateField` handles the recursion internally.

This is required because the subscription editor (§2) has deeply nested required fields (`template.titlePattern`, `template.severity`, `template.category`, `template.entityType`) and array items with required sub-fields (`constraints[].value`). Without recursive validation, these pass as non-null objects and the first error feedback comes from the server API.

---

## Part 2: Subscription Editor (#33)

### File

`components/notification-inbox/src/subscription-editor.ts`

### Contract

Already defined by `subscription-list.ts` (lines 415–433):

- **Properties:** `.subscription` (existing `Subscription` or `undefined` for new), `.endpoint`, `.identity`
- **Events:** `save` (dispatched after successful API call), `cancel`

### Architecture

The component has three responsibilities:

1. **Schema construction** — fetches `EventTypeDescriptor[]` from `getEventTypes()` on connect, builds a `FieldSchema` from the domain types
2. **Change orchestration** — when event type changes (via `pages-form-change`), rebuilds the constraints sub-schema and template field selects with the selected event type's field descriptors
3. **Save/cancel** — calls `submit()` on the form, maps the flat form data to `SubscriptionInput` / `SubscriptionUpdate`, calls `createSubscription()` or `updateSubscription()`, emits `save` or `cancel` events

### Schema Structure

```
name            — string, required
eventType       — oneOf from EventTypeDescriptor[] (value: eventType, label: displayName)
constraints     — array of objects:
  field           — oneOf from selected EventTypeDescriptor.fields (value: name, label: name + " (" + type + ")")
  op              — oneOf from ConstraintOp: EQ/NEQ/GT/LT/GTE/LTE/IN/STARTS_WITH/CONTAINS
  value           — string, required
targets         — array of objects:
  type            — oneOf: USER/GROUP/EVENT_FIELD/ENTITY_WATCHERS
  id              — string (required for USER/GROUP/EVENT_FIELD; optional for ENTITY_WATCHERS — resolved from event entity at dispatch time)
includeActor    — boolean (default false)
template        — nested object:
  titlePattern    — string, required, description: "Use ${fieldName} for interpolation"
  bodyPattern     — string, description: "Use ${fieldName} for interpolation"
  severity        — oneOf: INFO/WARNING/URGENT (required)
  category        — string, required
  actionUrlPattern — string, description: "Use ${fieldName} for interpolation"
  entityType      — string, required (freeform — EventTypeDescriptor has no entity metadata)
  entityIdField   — oneOf from selected EventTypeDescriptor.fields (value: name, label: name + " (" + type + ")")
  actorIdField    — oneOf from selected EventTypeDescriptor.fields (value: name, label: name + " (" + type + ")")
```

### Dynamic Schema Rebuild

When the `eventType` value changes:

1. Look up the matching `EventTypeDescriptor` from the fetched list
2. Extract its `fields: EventFieldDescriptor[]`
3. Rebuild the constraints array item schema's `field` property with a new `oneOf` populated from the field descriptors
4. Rebuild the template's `entityIdField` and `actorIdField` properties with `oneOf` options from the same field descriptors
5. Set the new schema on the form — it re-renders with updated field options
6. Clear any existing constraint rows (their field values are no longer valid)

### Edit Mode

When `.subscription` is set (edit mode):

- Pre-populate `.data` from the existing subscription record
- The `id` is not in the schema — it's tracked internally for the `updateSubscription()` API call
- `ownerId` and `tenancyId` come from `.identity`

### Error Handling

- API errors on save: display error message above the form, keep form data intact
- Event types fetch failure: display error state, no form rendered
- Loading state while fetching event types

### Export

Added to `components/notification-inbox/src/index.ts`.

---

## Part 3: Notification Preferences (#34)

All components live in `components/notification-inbox/` — they share the API client and types.

### 3.1 `channel-preferences.ts`

Schema-driven form for delivery channel settings.

**Data fetching:** `getChannels()` for available channels, `getPreferences()` for current settings.

**Schema:** Built dynamically from the channel list. For each `DeliveryChannelDescriptor`:

```
channels.<channelId>:
  enabled         — boolean (default from descriptor.defaultEnabled)
  minSeverity     — oneOf: INFO/WARNING/URGENT (default from descriptor.defaultMinSeverity)
  deliveryMode    — oneOf: IMMEDIATE (label: "Immediate") / DIGEST (label: "Digest")
                    (default: DIGEST when descriptor.defaultDigestSchedule is non-null, else IMMEDIATE)
  digestSchedule  — nested object, shown when deliveryMode = DIGEST:
    type            — oneOf: interval/daily_at/weekly_at
    period          — string (shown when type = interval), description: "ISO 8601 duration, e.g. PT1H"
    time            — format: 'time' (shown when type = daily_at or weekly_at)
    timezone        — string (shown when type = daily_at or weekly_at)
    dayOfWeek       — oneOf: MONDAY/TUESDAY/WEDNESDAY/THURSDAY/FRIDAY/SATURDAY/SUNDAY (shown when type = weekly_at)
  groupBy         — oneOf: FLAT/CATEGORY/ENTITY (shown when deliveryMode = DIGEST)
```

Plus quiet hours (separate from per-channel):

```
quietHours:
  start     — format: 'time'
  end       — format: 'time'
  timezone  — string
  action    — oneOf: SUPPRESS (label: "Suppress entirely") / BUFFER_FOR_DIGEST (label: "Buffer for next digest")
```

**Delivery mode conditional fields:** When `deliveryMode` changes, the component rebuilds the per-channel sub-schema: `IMMEDIATE` hides `digestSchedule` and `groupBy`; `DIGEST` shows them. Within `DIGEST`, when schedule `type` changes: `interval` shows `period`; `daily_at` shows `time + timezone`; `weekly_at` shows `dayOfWeek + time + timezone`. Same dynamic rebuild pattern as the subscription editor.

**API mapping:** `deliveryMode` is a UI-only concept. When saving: `IMMEDIATE` maps to `digestSchedule: null` in `NotificationPreferenceUpdate`; `DIGEST` maps to the configured `DigestSchedule` object. `groupBy` is included only when `deliveryMode = DIGEST`.

**Save:** Calls `updatePreferences()` with `NotificationPreferenceUpdate`. A "Clear quiet hours" button sets `clearQuietHours: true`.

**No optimistic update** — preferences are low-frequency. Failed save would leave the UI in a confusing state.

### 3.2 `mute-list.ts`

List of active mute rules with add/remove.

**Data fetching:** `listMuteRules()` on connect.

**List rendering:** `<pages-table>` showing scope, scopeId, entityType, expiresAt, and a remove button per row. Same pattern as `subscription-list.ts`.

**Add form:** An "Add Mute Rule" button shows an inline `<pages-schema-form>`:

```
scope       — oneOf: ENTITY (label: "Entity") / CATEGORY (label: "Category")
scopeId     — string, required
entityType  — string (shown when scope = ENTITY, hidden when scope = CATEGORY)
expiresAt   — format: 'date-time'
```

On submit, calls `addMuteRule()` with `MuteRuleInput` (userId and tenancyId from `.identity`).

**Scope-conditional fields:** When scope changes, the component rebuilds the add form schema — showing `entityType` for ENTITY scope, hiding it for CATEGORY scope. Same dynamic rebuild pattern.

**Remove:** Calls `removeMuteRule()` with `<blocks-confirm-dialog>` confirmation.

### 3.3 `snooze-control.ts`

Simple toggle with time picker.

**Data fetching:** `getSnooze()` on connect.

**Two states:**

1. **Not snoozed:** Shows a `<pages-schema-form>` with `until` (format: 'date-time', required) and an "Activate" button. Calls `activateSnooze()`.
2. **Snoozed:** Shows "Snoozed until {time}" with a "Cancel" button. Calls `cancelSnooze()`.

### 3.4 `notification-preferences.ts`

Container that composes the three child components.

Three stacked sections (not tabs — preferences are few enough to show all at once), each with a heading:

```html
<section>
  <h3>Delivery Channels</h3>
  <channel-preferences .endpoint=${...} .identity=${...}></channel-preferences>
</section>
<section>
  <h3>Muted</h3>
  <mute-list .endpoint=${...} .identity=${...}></mute-list>
</section>
<section>
  <h3>Snooze</h3>
  <snooze-control .endpoint=${...} .identity=${...}></snooze-control>
</section>
```

Passes `.endpoint` and `.identity` down. No orchestration beyond layout.

### Events

Each child emits `pages-event` CustomEvent on mutation:

| Component | Topic | Payload |
|-----------|-------|---------|
| channel-preferences | `preference.updated` | `{ preferences }` |
| mute-list | `mute.created` | `{ rule }` |
| mute-list | `mute.deleted` | `{ ruleId }` |
| snooze-control | `snooze.activated` | `{ snooze }` |
| snooze-control | `snooze.cancelled` | `{}` |

All five topics are added to `NotificationEventTopics` in `events.ts`, consistent with the existing centralised topic registry.

### Exports

All four components added to `components/notification-inbox/src/index.ts`.

---

## Part 4: Existing Form Migration

### GDPR erasure action

`components/gdpr-erasure-action/src/gdpr-erasure-action.ts` currently hand-codes its input form. Migrate the input phase to `<pages-schema-form>`:

```
subjectId   — string, required
reason      — oneOf from reasonOptions property
```

The three-phase flow (input → confirm dialog → receipt) stays. Only the input phase's HTML changes to use schema-form. The confirm dialog and receipt rendering remain hand-coded — they are not form fields.

The schema is rebuilt in `willUpdate` when `reasonOptions` changes — the `reason` field's `oneOf` is reconstructed from the new options. Same Lit lifecycle pattern as `pages-schema-form`'s `data` changes.

---

## Part 5: Testing Strategy

### pages-form schema improvements

Tests in `pages-schema-form.test.ts`:

- `oneOf` renders a `<select>` with correct value/label pairs
- `oneOf` display mode shows title instead of raw value
- `oneOf` validation rejects values not in the const set
- `oneOf` takes priority when both `oneOf` and `enum` are present
- `format: 'time'` renders `<input type="time">`
- `format: 'time'` display mode formats the value
- `readOnly` renders input with readonly attribute in edit mode
- `readOnly` fields are skipped during validation (returns null when `schema.readOnly` is true)
- Nested object validation: required sub-fields produce compound error messages
- Array item validation: required sub-fields in array items produce "Item N: field: error" messages
- `oneOf` renders disabled placeholder option when current value has no match

### Subscription editor

Tests in `subscription-editor.test.ts`:

- Fetches event types on connect, builds schema
- Renders form with correct field types
- Dynamic schema rebuild on event type change (constraint field options update)
- Dynamic schema rebuild on event type change updates `entityIdField` and `actorIdField` options
- Clears constraint rows on event type change
- ENTITY_WATCHERS target type: id field is optional (empty accepted); other types require id
- Create mode: calls `createSubscription()` with correct `SubscriptionInput`
- Edit mode: pre-populates form from existing subscription
- Edit mode: calls `updateSubscription()` with correct `SubscriptionUpdate`
- Emits `save` event after successful API call
- Emits `cancel` event on cancel
- Error state on API failure
- Loading state while fetching event types

### Notification preferences components

Tests in `channel-preferences.test.ts`, `mute-list.test.ts`, `snooze-control.test.ts`, `notification-preferences.test.ts`:

- channel-preferences: fetches channels + preferences, builds per-channel schema, saves via `updatePreferences()`, quiet hours clear
- channel-preferences: deliveryMode defaults from descriptor.defaultDigestSchedule (null → IMMEDIATE, non-null → DIGEST)
- channel-preferences: deliveryMode IMMEDIATE hides digestSchedule and groupBy; DIGEST shows them
- channel-preferences: deliveryMode IMMEDIATE maps to `digestSchedule: null` in API update
- channel-preferences: weekly_at digest schedule shows dayOfWeek + time + timezone fields
- channel-preferences: groupBy renders oneOf with FLAT/CATEGORY/ENTITY options
- channel-preferences: quiet hours action renders oneOf with SUPPRESS/BUFFER_FOR_DIGEST options
- mute-list: fetches and renders rules in table, add form submission, remove with confirmation, events emitted
- mute-list: scope change to CATEGORY hides entityType; scope change to ENTITY shows it
- snooze-control: shows activate form when not snoozed, shows cancel when snoozed, state transitions
- notification-preferences: renders all three child components, passes props down

### GDPR erasure action migration

Update existing tests in `gdpr-erasure-action.test.ts` to verify the schema-form renders the same fields. Three-phase flow tests remain unchanged. Verify schema rebuild when `reasonOptions` property changes.

---

## Not In Scope

- No new navigation or routing — components are standalone, apps decide where to mount them
- No SSE for preferences/mute/snooze — low-frequency settings, fetch on mount is sufficient (file as GitHub issue for future tracking)
- No drag-and-drop ordering for constraints/targets — add/remove via schema-form's array handling (file as GitHub issue for future tracking)

---

## Cross-Repo Impact

| Repo | Change | Reason |
|------|--------|--------|
| casehub-pages (`pages-form`) | Add `oneOf`, `format: 'time'`, `readOnly`, recursive validation to `FieldSchema` + renderers + validation | Schema improvements needed by blocks-ui consumers |
| casehub-blocks-ui | New components + gdpr migration | This spec |
| casehub-blocks-ui (`notification-inbox`) | Add `@casehubio/pages-form` to `dependencies` | New dependency for `<pages-schema-form>` |
| casehub-blocks-ui (`gdpr-erasure-action`) | Add `@casehubio/pages-form` to `dependencies` | New dependency for `<pages-schema-form>` |

No backend changes. All APIs are stable and tested. Frontend `types.ts` updates (adding `DigestScheduleWeeklyAt`, `DigestGroupBy`, `QuietHoursAction`, `ENTITY_WATCHERS` to `TargetType`) are part of this spec's implementation — they align the frontend types with the existing backend API.
