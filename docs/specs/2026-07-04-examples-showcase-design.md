# Examples Showcase — Design Spec

**Date:** 2026-07-04
**Status:** Approved

**Epic:** #4 (Work Item Management UI)
**Issue:** #17

## Overview

A self-contained Vite dev app at `examples/` that showcases all implemented blocks-ui components with mock data and simulated real-time SSE events. No backend required. Individual component demos plus a full composed workbench view. Stub components (case-timeline, channel-activity, trust-score-panel) are excluded until their implementations land (#10, #11).

## Architecture

Three layers:

1. **Mock data layer** — static JSON files for initial state + `MockSSESource` for scripted real-time events
2. **Mock fetch wrapper** — intercepts `fetch()` from components, returns mock data. Stateful — actions (claim, complete) update in-memory state and emit SSE events
3. **Gallery shell** — sidebar navigation, individual component pages, full workbench page

**Bootstrap order:** `main.ts` must `await` mock data initialization before rendering any components. The mock fetch wrapper is installed synchronously (replacing `window.fetch` and `window.EventSource`), but the JSON mock data files are loaded asynchronously. Components must not render until the in-memory state is populated — otherwise their initial fetches hit an empty state.

```typescript
// main.ts bootstrap sequence
window.EventSource = MockSSESource;
window.fetch = mockFetch;
await initMockState();  // loads JSON files, populates in-memory state
renderShell();           // components now safe to fetch
```

Not a workspace package — a dev tool with its own `package.json` and `vite.config.ts`. The `examples/` directory is not a member of the root yarn workspaces (`packages/*`, `components/*`). Sibling package imports (`@casehubio/blocks-ui-core`, `@casehubio/blocks-ui-work-item-inbox`, etc.) are resolved exclusively via Vite `resolve.alias` entries that point to sibling source directories. No `workspace:*` or `file:` dependencies — `examples/package.json` lists only Vite, Lit, and dev tooling.

## Gallery Shell

### Navigation

Sidebar with collapsible categories:

```
Components
  ├── Work Item Row
  ├── Work Item Inbox
  ├── Work Item Detail
  ├── Queue Board
  ├── Schema Form
Composed
  └── Full Workbench
```

URL hash routing: `#components/inbox`, `#composed/workbench`, etc.

### Top Bar

"blocks-ui Examples" title, theme toggle (light/dark), density toggle (comfortable/compact). Applied globally.

### Component Pages

Each page renders the component with mock data at full width. Below: a collapsible "Configuration" panel for toggling props (inbox mode, detail status, empty states).

### Full Workbench Page

`<work-item-workbench>` at full viewport height. The showcase — split pane, inbox-to-detail flow, queue board, all working together with mock data and real-time SSE events.

## Mock Data

Static JSON files in `examples/mock-data/`:

### `work-items.json`

15-20 work items with realistic titles across five app domains:

- **AML:** "Review suspicious transaction #4521", "SAR filing — entity cluster analysis"
- **Clinical:** "PI authorisation — adverse event AE-0847", "IRB consultation — protocol amendment"
- **Life:** "Contractor quote review — kitchen renovation", "Family vote — school choice"
- **IoT:** "Device situation response — temperature spike Zone B"
- **DevTown:** "Code review triage — PR #892 auth refactor"

Mix of statuses (PENDING, ASSIGNED, IN_PROGRESS, SUSPENDED, DELEGATED, plus some terminal), priorities (URGENT through LOW), categories, and candidate groups. Some items overdue, some with imminent deadlines, some comfortable.

Each item has realistic payload JSON, inputDataSchema, permittedOutcomes where appropriate, and labels matching queue patterns.

### `inbox-summary.json`

Pre-computed InboxSummary matching the work items: total, byStatus, byPriority, overdue, claimDeadlineBreached.

### `queues.json`

4-5 named queues: "Compliance Review", "Clinical Safety", "Household Tasks", "Device Alerts", "Code Review Triage". Each with a `labelPattern` string.

**Mock label matching:** In the real system, queue membership uses JEXL expressions — the mock does not implement JEXL. Instead, each mock queue's `labelPattern` is a simple `key=value` string (e.g., `"domain=aml"`). The mock matches a work item to a queue if the item has a label with `name` equal to `key` and `value` equal to `value`. Mock data items and queue definitions are co-designed so this simple matching produces the right groupings.

### `activity.json`

Template lifecycle event sequence: created → assigned → started → suspended → resumed → completed, with realistic actors and timestamps. The `/workitems/{id}/events` mock endpoint generates per-item activity by adapting this template to each item's current status — a PENDING item gets only a "created" event, an IN_PROGRESS item gets created → assigned → started, etc. Timestamps are derived from the item's `createdAt` and status transition fields.

### `relations.json`

Parent/child/linked work items for the relations tab demo.

### `sse-script.json`

Scripted SSE event sequence with timing offsets:

```json
[
  { "delay": 5000, "event": { "type": "CREATED", "workItemId": "wi-new-1", "status": "PENDING", ... } },
  { "delay": 10000, "event": { "type": "ASSIGNED", "workItemId": "wi-003", "status": "ASSIGNED", ... } },
  { "delay": 15000, "event": { "type": "COMPLETED", "workItemId": "wi-007", "status": "COMPLETED", ... } },
  { "delay": 20000, "event": { "type": "EXPIRED", "workItemId": "wi-012", "status": "EXPIRED", ... } }
]
```

Event `type` values must use `WorkEventType` short forms (`CREATED`, `ASSIGNED`, `STARTED`, etc.) — the SSE connection manager extracts `data.type` from the parsed JSON and the component handlers compare against `WorkEventType` enum values, not CloudEvent type URIs.

Loops with ±2s random jitter when the script ends.

## MockSSESource

Replaces global `EventSource` before components load:

```typescript
window.EventSource = MockSSESource;
```

The mock layer boots globally in `main.ts` before any component loads. SSE simulation is active on all pages — individual component pages (inbox-page, detail-page, queue-page) have SSE running, not just the full workbench. Without SSE, individual demos would be static and undersell the components' real-time capabilities.

**Two event sources:**

1. **Scripted events** — ambient demo activity from `sse-script.json`, fired on timers
2. **Action-triggered events** — when mock-fetch handles an action (claim, complete, etc.), it updates state via `mock-state.ts`, which pushes an ad-hoc event through MockSSESource to all subscribed instances

`mock-state.ts` is the central authority: it owns the in-memory work item state, serves fetch responses, and emits SSE events through MockSSESource. Both scripted timers and action handlers flow through it.

**Behaviour:**
- Sets `readyState = 1` (OPEN) immediately
- Reads `sse-script.json`, starts timer sequence
- Each timer fires `onmessage` with `MessageEvent` containing the scripted event
- Loops on completion with jitter
- Tracks all MockSSESource instances globally. Multiple components (inbox, queue-board) each create their own `SSEManager` instance, each opening a separate `EventSource` for the same URL. MockSSESource delivers events to ALL instances subscribed to a matching URL — not just the first.
- Supports multiple concurrent stream URLs (`/workitems/events` global, `/queues/{id}/events` per-queue — per-queue streams derive from the global script, filtered by queue membership)

**Known limitation:** The queue-board component's SSE handler checks `event.type === 'work-item.lifecycle'` instead of reading `event.data.type` against `WorkEventType` values like the inbox does. This means the queue board is deaf to all SSE events and only refreshes via its 30-second polling timer. Filed as bug #19 — the showcase will work correctly once fixed, with no changes needed to mock layer.

## Mock Fetch

Wraps `window.fetch` before components load. The interceptor resolves known URL patterns first, falling through to real fetch only for unrecognised URLs. This is necessary because Vite's SPA fallback returns `200 OK` with `index.html` for any unmatched route — `fetch()` would not throw, making a try-catch approach silently return wrong content.

```typescript
const realFetch = window.fetch;
window.fetch = async (url, opts) => {
  const mock = resolveMock(url, opts);
  if (mock) return mock;
  return realFetch(url, opts);
};
```

Pattern matching for URL → mock data:

| URL pattern | Response |
|------------|----------|
| `/workitems/inbox` | Items from `work-items.json` filtered by query params |
| `/workitems/inbox/summary` | `inbox-summary.json` (recomputed from current state) |
| `/workitems/{id}` | Matching item from in-memory state |
| `/workitems/{id}/events` | Activity events for the item — generated from `activity.json` template, adapted per item's status history |
| `/workitems/{id}/relations` | Related items for the item from `relations.json` (note: `work-item-detail` does not yet pass `relatedItems` to the relations tab — tracked in #18) |
| `/workitems/{id}/claim` | Update status to ASSIGNED, emit SSE ASSIGNED event |
| `/workitems/{id}/start` | Update to IN_PROGRESS, emit SSE STARTED |
| `/workitems/{id}/complete` | Update to COMPLETED, emit SSE COMPLETED |
| `/workitems/{id}/reject` | Update to REJECTED, emit SSE REJECTED |
| `/workitems/{id}/delegate` | Update to DELEGATED, emit SSE DELEGATED |
| `/workitems/{id}/escalate` | Update to ESCALATED, emit SSE ESCALATED |
| `/workitems/{id}/suspend` | Update to SUSPENDED, emit SSE SUSPENDED |
| `/workitems/{id}/resume` | Restore priorStatus, emit SSE RESUMED |
| `/workitems/{id}/cancel` | Update to CANCELLED, emit SSE CANCELLED |
| `/workitems/{id}/release` | Update to PENDING, emit SSE RELEASED |
| `/workitems/{id}/accept-delegation` | Update to ASSIGNED, emit SSE DELEGATION_ACCEPTED |
| `/workitems/{id}/decline-delegation` | Update to PENDING/restore, emit SSE DELEGATION_DECLINED |
| `/workitems/bulk` | Process each item, return BulkItemResult array |
| `/queues` | `queues.json` |
| `/queues/{id}/items` | Items matching queue's label pattern from in-memory state |

**Stateful:** `mock-state.ts` keeps an in-memory copy of all work items. Action handlers (claim, complete, delegate, etc.) update state through `mock-state.ts`, which both mutates the in-memory store and pushes a corresponding SSE event through `MockSSESource` to all subscribed `EventSource` instances. Subsequent fetches reflect the updated state. The demo is interactive — you can claim, complete, and delegate items and see the UI respond realistically across all active components.

## File Structure

```
examples/
  index.html              — entry point
  package.json            — vite, lit deps
  vite.config.ts          — workspace aliases
  src/
    main.ts               — bootstrap: install mocks, inject theme, render shell
    shell.ts              — gallery shell component (sidebar, routing, top bar)
    pages/
      inbox-page.ts       — inbox demo with config panel
      detail-page.ts      — detail demo with status selector
      queue-page.ts       — queue board demo
      row-page.ts         — work item row demo
      schema-form-page.ts — schema form demo (display + edit modes)
      workbench-page.ts   — full workbench demo
    mock/
      mock-fetch.ts       — fetch interceptor with stateful mock data
      mock-sse.ts         — MockSSESource replacing EventSource
      mock-state.ts       — in-memory work item state manager
  mock-data/
    work-items.json
    inbox-summary.json
    queues.json
    activity.json
    relations.json
    sse-script.json
```

## Scripts

```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

Root `package.json` gets a new script: `"examples": "yarn --cwd examples dev"`
