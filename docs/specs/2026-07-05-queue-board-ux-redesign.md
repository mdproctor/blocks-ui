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

**Data source:** `GET /queues` for queue definitions. Per-queue item counts and breach indicators are computed by fetching each queue's items via `GET /queues/{id}` (lazy — on first render, then cached and updated via SSE).

### Scope Context Bar

Visible only when a queue is selected. Shows the queue's label pattern constraints as read-only tags (e.g., `domain=clinical`, `severity=*`). Includes a "✕ clear" action that deselects the queue.

This bar explains WHY the population is narrowed — it surfaces the queue's structural filter. It is not interactive (users cannot modify the queue's label pattern from here).

### Tabs — Three Permanent Perspectives

The inbox tabs change from two to three:

| Tab | Filter predicate | When no queue | When queue active |
|-----|-----------------|---------------|-------------------|
| My Work | `assigneeId == me` AND `isActive(status)` | All my assigned items | My assigned items in this queue |
| Claimable | `status == PENDING` AND `candidateGroups ∩ myGroups` | All claimable items | Claimable items in this queue |
| All | No assignee filter | All items (team view) | All items in this queue |

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
- Always interactive regardless of queue selection
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
| `queue-pill-bar` | Horizontal row of single-select queue pills. Fetches queue definitions, computes per-queue counts and breach indicators. Emits `queue-scope-changed` event with `QueueView \| null`. |

### Extend

| Component | Changes |
|-----------|---------|
| `inbox-filter-bar` | Accept a `disabledStatuses: Set<string>` property. Disabled pills get greyed styling (`opacity: 0.4`, `cursor: default`, no click handler). Add per-pill counts via `statusCounts: Map<string, number>` and `priorityCounts: Map<string, number>` properties. |
| `inbox-summary-bar` | Already supports scoped counts via `visibleTotal`, `visibleOverdue`, `visibleBreach` props. No structural change needed. |
| `work-item-inbox` | Add queue pill bar to the render tree (above tabs). Add "All" as a third tab. Listen for `queue-scope-changed` to set the active queue scope. Compute disabled statuses and per-pill counts from the scoped population. Render scope context bar when queue is active. |
| `work-item-workbench` | Remove `LeftPanelView` type and the Queues tab. Left panel is always the inbox. Remove `_unsubscribeQueueSelection` and `_unsubscribeQueueDeselection` event handlers. Remove the `queue-board` import. |

### Types

```typescript
interface QueueScope {
  readonly queue: QueueView;
  readonly items: WorkItemResponse[];
  readonly statusCounts: ReadonlyMap<string, number>;
  readonly priorityCounts: ReadonlyMap<string, number>;
  readonly overdueCount: number;
  readonly breachCount: number;
}

interface QueueScopeChangedPayload {
  readonly scope: QueueScope | null;
}
```

Add `QUEUE_SCOPE_CHANGED: 'queue.scope-changed'` to `WorkItemEventTopics`.

Remove `QUEUE_SELECTED` and `QUEUE_DESELECTED` from `WorkItemEventTopics` (replaced by `QUEUE_SCOPE_CHANGED`).

Change `InboxMode` from `'my-work' | 'claimable'` to `'my-work' | 'claimable' | 'all'`.

### Event Flow

1. User clicks a queue pill in `queue-pill-bar`
2. `queue-pill-bar` fetches the queue's items via `GET /queues/{id}`
3. `queue-pill-bar` computes `QueueScope` (counts, breach, overdue)
4. `queue-pill-bar` emits `pages-event` with topic `queue.scope-changed` and `QueueScope` payload
5. `work-item-inbox` receives the event, stores the scope, triggers re-render:
   - Scope context bar appears showing queue label pattern
   - Tab counts update (My Work / Claimable / All filtered within queue scope)
   - Filter pills recompute disabled states and counts
   - Summary badges recompute from scope × tab × filters
   - Item list re-filters through the full pipeline

### Filter Pipeline

The inbox's `getFilteredItems()` method extends to select the data source first, then apply the pipeline:

```
source = queue active ? queueScope.items : inboxItems
source
  → perspective filter (my work / claimable / all)
  → status filter (if any status pills active)
  → priority filter (if any priority pills active)
  → overdue / breach filter (if toggled)
  = visible items
```

When a queue is active, the source is the queue's item set (received via `QueueScope`). When no queue is active, the source is the inbox data (existing behaviour). The perspective filter then applies identically regardless of source.

### Data Loading Strategy

Two data populations:

- **Inbox data** — fetched from `/workitems/inbox`. Contains items personally relevant to the user (assigned to them, or claimable by their groups). Used by My Work and Claimable tabs when no queue is active.
- **Queue data** — fetched from `GET /queues/{id}`. Contains ALL items matching the queue's label pattern regardless of assignee. Used by all three tabs when a queue is active.

When a queue is selected, the `queue-pill-bar` fetches the queue's full item set via `GET /queues/{id}` and emits it in the `QueueScope` payload. The inbox then filters ALL three tabs from this queue data set — not from the inbox data. This is necessary because the "All" tab needs items that may not appear in the inbox endpoint (items assigned to other users outside the current user's groups).

When no queue is selected, My Work and Claimable filter from inbox data (existing behaviour). The "All" tab with no queue filters from inbox data with no perspective predicate applied — showing all items the user has visibility into.

SSE handling: the existing inbox SSE subscription (`/workitems/events`) continues to handle lifecycle events. When a queue is active, the queue-specific SSE stream (`/queues/{id}/events`) is also subscribed to detect items entering or leaving the queue.

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
