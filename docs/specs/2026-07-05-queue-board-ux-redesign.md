# Queue Board UX Redesign — Navigation Pattern and Constrained Filter Pills

**Issue:** casehubio/blocks-ui#20
**Date:** 2026-07-05

---

## Problem

The current queue board uses a dashboard-of-giant-cards that drills into a separate list view. This creates three problems:

1. **Disorienting navigation** — clicking a queue card switches to a list view with a "Back to Dashboard" button. The back-and-forth between dashboard and list loses spatial context.
2. **No filter integration** — the queue list view renders raw work-item rows with no filter bar, no summary badges, and no batch operations. The inbox's filter UX is unavailable in the queue context.
3. **Two separate worlds** — the workbench splits Inbox and Queues into separate tabs with incompatible UX. "My items in the Compliance queue" is an impossible query.

## Root Cause

The design treats queues and personal work views as the same kind of thing (peer tabs) when they are orthogonal dimensions:

- **Population scope** (queue) — which items are in the universe, defined by a label pattern
- **Perspective** (my work / claimable / all) — what's the user's relationship to those items
- **Ad-hoc filters** (status, priority, overdue) — further refinement

Queues are defined by label patterns (a content property). Personal perspectives are defined by assignee (a relationship property). These compose naturally — "my assigned items in the Compliance queue" is a meaningful intersection. No competitor (Zendesk, Jira SM, Freshdesk, ServiceNow) supports this composition because they flatten queues and personal views into a single saved-filter concept.

## Design

### Dimensional Model

Three orthogonal filtering axes, each with its own UI control:

| Axis | Question | Control | Values |
|------|----------|---------|--------|
| Population scope | Which items exist? | Queue pill bar | None (all) or one selected queue |
| Perspective | What's my relationship? | Tabs | My Work · Claimable · All |
| Ad-hoc filters | Further refinement? | Filter pills + summary badges | Status · Priority · Overdue · Breach |

The effective query is: `items × scope(queue) × perspective(tab) × filter(status, priority, overdue)`.

### Queue Pill Bar

A horizontal row of compact pills above the tabs. Each pill represents a `QueueView` and shows:

- Queue name
- Item count (total items matching the queue's label pattern)
- Breach indicator (red badge with count, shown when queue has overdue items)

**Interaction:**
- Single-select (radio behaviour) — click a pill to scope, click the active pill to deselect
- Deselecting returns to the global view (no queue scope)
- Pills sorted by urgency: queues with breaches first, then by total count descending
- Horizontal scroll when pills overflow the container width

**Data source:** `GET /queues` for queue definitions. `GET /queues/summary` for per-queue counts and breach indicators in a single call (returns `{queueId, count, breachCount}[]`).

**Summary refresh:** When the inbox processes an `ADDED` or `REMOVED` event on the selected queue's SSE stream, it passes the updated item count to the pill bar via a reactive property. The pill bar renders the latest count without any server round-trip — it does not subscribe to SSE itself. All other queue counts (unselected queues) refresh via `GET /queues/summary` on a 30-second polling interval matching the existing queue-board cadence. The selected queue also benefits from the 30-second poll as a consistency backstop.

### Scope Context Bar

Visible only when a queue is selected. Shows the queue's label pattern constraints as read-only tags (e.g., `domain=clinical`, `severity=*`). Includes a "✕ clear" action that deselects the queue.

This bar explains WHY the population is narrowed — it surfaces the queue's structural filter. It is not interactive (users cannot modify the queue's label pattern from here).

**Label pattern rendering:** `QueueView.labelPattern` is currently a simple `key=value` string (e.g., `domain=aml`). The scope context bar splits on `=` and renders as `key: value` tag. For patterns that don't parse as simple `key=value` (future complex patterns), the raw pattern string is rendered as a single tag with monospace font. This ensures forward compatibility without coupling the UI to a specific query language.

### Tabs — Three Permanent Perspectives

The inbox tabs change from two to three:

| Tab | Filter predicate | When no queue | When queue active |
|-----|-----------------|---------------|-------------------|
| My Work | `assigneeId == me` AND `isActive(status)` | All my assigned items | My assigned items in this queue |
| Claimable | `status == PENDING` AND `candidateGroups ∩ myGroups` | All claimable items | Claimable items in this queue |
| All | No perspective predicate | Union of assigned + claimable (full inbox) | All items in this queue |

Tabs are permanent — they don't appear or disappear based on queue selection. Each tab shows an inline count reflecting the current scope: `My Work (2)`, `Claimable (3)`, `All (8)`.

The "All" tab serves the triage use case — a team lead seeing the full queue population regardless of assignee.

### Constrained Filter Pills

When a queue is active, filter pills reflect the queue's actual population:

**Status pills:**
- Each pill shows a count of items with that status in the current scope × tab
- Pills with count > 0 are interactive (toggle active/inactive)
- Pills with count = 0 are visually disabled (greyed text, no hover, `cursor: default`)
- Counts update when the queue selection or tab changes

**Priority pills:**
- Show counts from the current scope × tab
- Zero-count pills are disabled (same treatment as status)

**Overdue and breach badges:**
- Counts reflect scope × tab intersection, not global totals
- Claim breach badge only shown on the Claimable tab (unchanged behaviour)

### Summary Badges

Total, Overdue, and Breach badges in the summary bar reflect the current scope × tab × active filters. When a queue is selected, these are scoped to the queue's population, not global.

### Workbench Changes

The workbench's `LeftPanelView` type drops the `'queues'` variant. The left panel is always the inbox. The "Queues" tab in the workbench tab bar is removed entirely — queue selection lives inside the inbox via the pill bar.

## Component Changes

### Remove

| Component | Reason |
|-----------|--------|
| `queue-board` | Replaced by queue pill bar inside inbox |
| `queue-card` | Replaced by compact queue pills |

### New

| Component | Responsibility |
|-----------|---------------|
| `queue-pill-bar` | Horizontal row of single-select queue pills. Fetches queue definitions (`GET /queues`) and summary counts (`GET /queues/summary`). Pure navigation — emits `queue-scope-changed` event with `QueueView \| null` payload. Does NOT fetch queue items — that is the inbox's responsibility. |

### Extend

| Component | Changes |
|-----------|---------|
| `inbox-filter-bar` | Add per-pill counts via `statusCounts: Map<string, number>` and `priorityCounts: Map<string, number>` properties. Pills with count = 0 are visually disabled (`opacity: 0.4`, `cursor: default`, no click handler). Disabled state is derived from count — no separate `disabledStatuses` property needed. |
| `inbox-summary-bar` | Already supports scoped counts via `visibleTotal`, `visibleOverdue`, `visibleBreach` props. No structural change needed. |
| `work-item-inbox` | Add queue pill bar to the render tree (above tabs). Add "All" as a third tab. Listen for `queue-scope-changed` to receive the selected `QueueView`. On queue selection, fetch queue items via `GET /queues/{id}/items`, wrap each `WorkItemResponse` in `WorkItemRootResponse` (with `childCount: 0`, null child fields), and store as the queue data source. Compute per-pill counts from the scoped population. Render scope context bar when queue is active. Manage queue SSE lifecycle and use AbortController for in-flight queue fetches. |
| `work-item-workbench` | Remove `LeftPanelView` type and the Queues tab. Left panel is always the inbox. Remove `_unsubscribeQueueSelection` and `_unsubscribeQueueDeselection` event handlers. Remove the `queue-board` import. |

### Types

```typescript
// Event payload — pill bar → inbox (pure navigation signal)
interface QueueScopeChangedPayload {
  readonly queue: QueueView | null;
}

// Internal to work-item-inbox — NOT a cross-component event payload
interface QueueScope {
  readonly queue: QueueView;
  readonly items: WorkItemRootResponse[];
  readonly statusCounts: ReadonlyMap<string, number>;
  readonly priorityCounts: ReadonlyMap<string, number>;
  readonly overdueCount: number;
  readonly breachCount: number;
}

// Summary endpoint response (GET /queues/summary)
interface QueueSummaryEntry {
  readonly queueId: string;
  readonly count: number;
  readonly breachCount: number;
}
```

Add `QUEUE_SCOPE_CHANGED: 'queue.scope-changed'` to `WorkItemEventTopics`.

Remove `QUEUE_SELECTED` and `QUEUE_DESELECTED` from `WorkItemEventTopics` (replaced by `QUEUE_SCOPE_CHANGED`).

Change `InboxMode` from `'my-work' | 'claimable'` to `'my-work' | 'claimable' | 'all'`.

### Event Flow

1. User clicks a queue pill in `queue-pill-bar`
2. `queue-pill-bar` emits `pages-event` with topic `queue.scope-changed` and `{ queue: QueueView }` payload
3. `work-item-inbox` receives the event, cancels any in-flight queue fetch (via AbortController), and fetches the queue's items via `GET /queues/{id}/items`
4. Inbox wraps each `WorkItemResponse` in `WorkItemRootResponse` (with `childCount: 0`, null child/group fields) to maintain type consistency with the existing pipeline
5. Inbox builds internal `QueueScope` (items, counts, breach, overdue) and opens a queue SSE subscription (`/queues/{id}/events`)
6. Re-render triggers:
   - Scope context bar appears showing queue label pattern
   - Tab counts update (My Work / Claimable / All filtered within queue scope)
   - Filter pills recompute counts (pills with count = 0 disabled)
   - Summary badges recompute from scope × tab × filters
   - Item list re-filters through the full pipeline

### Filter Pipeline

The inbox's `getFilteredItems()` method extends to select the data source first, then apply the pipeline:

```
source = queue active ? queueScope.items : inboxItems   // both are WorkItemRootResponse[]
source
  → perspective filter (my work / claimable / all)
  → status filter (if any status pills active)
  → priority filter (if any priority pills active)
  → overdue / breach filter (if toggled)
  = visible items
```

When a queue is active, the source is the queue's item set (fetched by the inbox on queue selection, stored in internal `QueueScope`). When no queue is active, the source is the inbox data (existing behaviour). Because both sources are `WorkItemRootResponse[]`, the entire downstream pipeline (perspective filter, status/priority filters, rendering, batch operations) works identically regardless of source. Queue items have `childCount: 0` and null child/group fields since the queue endpoint returns flat `WorkItemResponse[]`.

### Data Loading Strategy

Two data populations, both owned by the inbox:

- **Inbox data** — fetched from `/workitems/inbox`. Contains items personally relevant to the user (assigned to them, or claimable by their groups). Used by My Work and Claimable tabs when no queue is active.
- **Queue data** — fetched from `GET /queues/{id}/items` by the inbox when a queue is selected. Contains ALL items matching the queue's label pattern regardless of assignee. Each `WorkItemResponse` is wrapped in `WorkItemRootResponse` at fetch time. Used by all three tabs when a queue is active.

When a queue is selected, the inbox fetches the queue's full item set via `GET /queues/{id}/items`, wraps items in `WorkItemRootResponse`, builds its internal `QueueScope`, and switches the filter pipeline's data source. This is necessary because the "All" tab needs items that may not appear in the inbox endpoint (items assigned to other users outside the current user's groups).

When no queue is selected, My Work and Claimable filter from inbox data (existing behaviour). The "All" tab with no queue filters from inbox data with no perspective predicate applied — showing the union of the user's assigned and claimable items without tab-level filtering.

**Race condition handling:** The inbox maintains an `AbortController` for queue item fetches. When a new queue is selected while a fetch is in-flight, the previous fetch is aborted. The newly selected pill shows a loading indicator until its data arrives. Deselecting all queues also aborts any in-flight queue fetch.

**Batch operations:** Batch claim and batch cancel work identically regardless of whether a queue is active. Because queue items are wrapped in `WorkItemRootResponse`, the batch operation payload construction (`BulkRequest`) is unchanged. Batch claim is available on the Claimable tab in queue context — this is a core triage operation (claim multiple items from a queue's claimable pool).

**Error states:**

- **`GET /queues/summary` failure:** Pill bar renders pills with queue names but no count or breach indicator. Silent retry on the next 30-second poll. No error toast — counts are informational, not actionable.
- **`GET /queues/{id}/items` failure:** The queue pill remains visually selected but shows an error indicator (red border). The inbox items area shows an inline error message (same pattern as the existing `this.error` state at `work-item-inbox.ts:536`). Clicking the errored pill again retries the fetch. Stale data from a previous queue is cleared — the inbox does not fall back to showing the wrong queue's items.
- **Queue SSE connection failure:** `SSEManager` handles reconnection with exponential backoff (1s base, 30s max). During reconnection, queue data is stale but functional. No additional error UI beyond what `SSEManager` already provides.

### SSE Lifecycle

The existing inbox SSE subscription (`/workitems/events`) remains active at all times — it handles lifecycle events for the inbox data source.

**Queue SSE stream (`/queues/{id}/events`):**

- **Opened:** when a queue is selected (after the initial item fetch completes)
- **Closed:** when the queue is deselected, or when a different queue is selected (close old stream before opening new)
- **Event handling:** Queue events (`WorkItemQueueEvent` with `eventType: 'ADDED' | 'REMOVED' | 'CHANGED'`) update the internal `QueueScope`. `ADDED` triggers a single-item fetch (`GET /workitems/{id}`) and inserts into the queue item set. `REMOVED` removes the item. `CHANGED` triggers a single-item re-fetch and updates in place.
- **Reconnection:** Uses the same `SSEManager` as the inbox stream, which provides exponential backoff reconnection (1s base, 30s max).
- **Overlap:** An item may appear on both streams (it's in the user's inbox AND in the selected queue). When a queue is active, queue data is the rendering source; inbox SSE events that affect queue items are ignored for rendering purposes (the queue SSE stream is the authority). When the queue is deselected, the inbox SSE state resumes authority.

**Inbox SSE handler fix (`handleItemAppears`):** The existing `shouldBeVisible` check (`work-item-inbox.ts:436-445`) is tab-aware — it checks `this.activeTab` to decide whether to add or remove items from `this.items`. This is architecturally wrong: `this.items` is the full inbox dataset, and tab filtering is handled downstream by `getFilteredItems()`. When the "All" tab is active, `shouldBeVisible` is always `false` (no branch for `'all'`), causing every SSE lifecycle event to remove items from the array until it's empty.

The fix is to make `shouldBeVisible` tab-independent. An item belongs in `this.items` if it is in the inbox population at all — matching EITHER the my-work predicate (`assigneeId == me && isActive(status)`) OR the claimable predicate (`status == PENDING && candidateGroups ∩ myGroups`). The active tab determines which items are _rendered_ (via `getFilteredItems()`), not which items are in the data array. This also fixes a pre-existing bug where items visible only on the other tab are silently removed on SSE events.

When a queue is active, the inbox SSE handler continues to manage `this.items` (the inbox data) — changes to `this.items` don't affect the current view because the rendering source is `queueScope.items`. Queue items are managed by the queue SSE handler (ADDED/REMOVED/CHANGED events on `/queues/{id}/events`).

**Note (issue #19):** The existing queue-board's SSE handler checks `event.type === 'work-item.lifecycle'` which never matches — `SSEManager` sets `event.type` from the parsed JSON data's `.type` field (a `WorkEventType` value like `'CREATED'`). The new implementation must parse `event.data` to determine event type, matching the pattern in `work-item-inbox.ts:354-357`. See casehubio/blocks-ui#19.

## Accessibility

- Queue pills are `role="radio"` within a `role="radiogroup"` with `aria-label="Queue scope"`
- Active pill gets `aria-checked="true"`
- Disabled filter pills get `aria-disabled="true"` and are excluded from the roving tabindex
- Scope context bar is `role="status"` with `aria-live="polite"` so screen readers announce queue changes
- "All" tab follows the same `aria-current` pattern as existing tabs
- Keyboard: arrow keys navigate pills (roving tabindex), Enter/Space toggles selection, Escape clears queue scope

## What This Removes

- The `queue-board` grid of giant cards
- The `queue-card` component
- The dashboard → list → back-button navigation pattern
- The "Queues" tab in the workbench
- The `ViewMode` type (`'dashboard' | 'list'`) and all view-switching logic
- The `_intersectionObserver` on queue cards (issue #16 item — dead code)
- The `QUEUE_SELECTED` and `QUEUE_DESELECTED` event topics

## What This Adds

- Orthogonal queue × perspective composition (unique to CaseHub — no competitor supports this)
- "All" tab for triage/supervisor use case
- Per-pill counts on filter pills showing population breakdown
- Queue-scoped summary badges
- Scope context bar showing queue label constraints

## Examples Directory

`examples/src/pages/queue-page.ts` renders `<queue-board>` which is removed by this spec. Replace with a new `queue-inbox-page.ts` that renders `<work-item-inbox>` with queue pill bar context — demonstrating the integrated queue-in-inbox experience. Remove the old `queue-page.ts`.

## Deferred Items

The following pre-existing issues (casehubio/blocks-ui#16) overlap with files modified by this spec but are not addressed here:

- **Workbench container queries missing `container-type`** — the workbench is modified (removing Queues tab) but the CSS fix is orthogonal. Deferred to #16.
- **Hardcoded spacing in filter-bar and summary-bar** — filter-bar is extended with count properties but spacing fixes are a separate concern. Deferred to #16.
- **LiveRegionMixin unused** — this spec adds `aria-live="polite"` on the scope context bar (see Accessibility section). Broader LiveRegionMixin adoption (claims, completions, batch results) is tracked by #16.
