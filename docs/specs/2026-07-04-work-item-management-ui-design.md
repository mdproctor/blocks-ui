# Work Item Management UI — Design Spec

**Epic:** #4 — Work Item Management UI
**Date:** 2026-07-04
**Status:** Approved

## Overview

Shared Web Components for work item management across all CaseHub applications. Four components — inbox, detail panel, queue board, and an orchestrating workbench — built as Lit Web Components with a Linear-calibre visual design system. Consumes the `casehub-work` REST API and SSE streams.

Every CaseHub app (AML, Life, Clinical, IoT, DevTown) creates WorkItems for human decision points. The platform API is mature; the shared UI layer is missing.

## Design Decisions

### Visual Design System

Adopt Radix's 12-step colour scale structure with LCH colour space for theme generation. Both light and dark modes are first-class, derived from the same three inputs: base colour, accent colour, contrast level.

Bootstrap tokens in blocks-ui-core now. Extract to pages later when pages is ready — designed for extraction, not rewrite.

### Technology

- **Rendering:** Lit Web Components with Shadow DOM
- **Theming:** CSS custom properties (tokens pierce shadow boundary)
- **Interaction primitives:** Custom Lit mixins for roving tabindex, focus trap, live region, keyboard shortcuts
- **Pages interop:** `hostPanel` mounting, `dataset()` consumption, `pages-event` communication
- **Responsive:** CSS container queries (responds to container size, not viewport)

### Component Composition

Standalone components communicate via `pages-event`. The workbench is a pre-built composition that adds layout, transitions, and keyboard flow. Apps use either level:

```
blocks-ui-core          (tokens, theme, SSE helpers, schema-form, mixins, identity)
├── work-item-row       (shared row rendering for inbox and queue list mode)
├── work-item-inbox     (standalone, emits selection events)
├── work-item-detail    (standalone, listens for selection, emits actions)
├── queue-board         (standalone, emits queue/item selection)
└── work-item-workbench (composes all three, adds layout/transitions/keyboard)
```

## 1. Design Token System

### Colour Scales

12 steps per hue, following Radix's semantic mapping:

| Steps | Purpose | Example |
|-------|---------|---------|
| 1–2 | Backgrounds (app, subtle) | Page bg, card bg |
| 3–4 | Interactive backgrounds (hover, active) | Button hover, selected row |
| 5–6 | Borders (subtle, strong) | Card border, input border |
| 7–8 | Solid backgrounds (normal, hover) | Badges, status pills |
| 9–10 | Solid backgrounds (primary action) | Primary button, accent |
| 11–12 | Text (low contrast, high contrast) | Secondary text, primary text |

Semantic hues: `accent` (CaseHub brand), `neutral` (grays), `success`, `warning`, `danger`, `info`. Each generated as a full 12-step scale in both light and dark mode from a single LCH base value + contrast parameter.

### Non-Colour Tokens

- **Spacing:** 4px base, scale of 0.5/1/1.5/2/3/4/5/6/8/10/12/16 (2px–64px)
- **Typography:** Inter font, 6-step size ramp (xs/sm/base/lg/xl/2xl), 3 weights (normal/medium/semibold)
- **Elevation:** 4 levels (base → elevated → nested → overlay), each with corresponding shadow and surface-colour tokens
- **Motion:** 3 duration tiers (fast: 120ms, normal: 200ms, slow: 350ms), 2 easings (ease-out for enters, ease-in-out for transitions)
- **Radius:** 3 levels (sm: 4px, md: 6px, lg: 8px)
- **Density modes:** `comfortable` (default) and `compact` (reduced spacing for power users) — token-layer variant, not separate theme

All delivered as CSS custom properties on root classes: `blocks-theme-dark`, `blocks-theme-light`, `blocks-density-compact`.

## 2. Component Architecture

### Lit Mixins (blocks-ui-core)

| Mixin | What it handles | Used by |
|-------|----------------|---------|
| `RovingTabindexMixin` | Arrow-key navigation through lists/rows, focus management | Inbox list, queue card grid |
| `FocusTrapMixin` | Trap focus in overlays, restore on close | Confirmation dialogs, delegate modal |
| `LiveRegionMixin` | Announce state changes to screen readers | Status updates, SLA breaches, claim confirmations |
| `KeyboardShortcutMixin` | Register and handle keyboard shortcuts with hint display. **Input suppression:** single-key shortcuts (no modifier) are suppressed when `document.activeElement` is an `<input>`, `<textarea>`, `<select>`, or `[contenteditable]` element — prevents shortcuts from firing while the user types in note forms, delegate/escalate reason fields, or schema-form edit mode. Modifier shortcuts (Ctrl+, Cmd+) always fire. | Workbench-level shortcuts |

### Responsive Strategy

CSS container queries with three breakpoints:

| Breakpoint | Layout | Example |
|------------|--------|---------|
| `< 480px` | Compact — single column, stacked content | Phone, narrow embed |
| `480–768px` | Medium — constrained but side-by-side where possible | Tablet, half-screen |
| `> 768px` | Full — maximum density, all columns visible | Desktop, wide embed |

### Data Input

Each component accepts data two ways:
1. `endpoint` prop — component fetches its own data from the REST API
2. `data` prop — parent passes pre-fetched data (for pages `dataset()` integration)

Events use `pages-event` CustomEvent with typed detail payloads (see §9 pages-event Contract).

### Identity & Configuration

All components require user identity to function. `blocks-ui-core` exports a `WorkIdentity` interface:

```typescript
interface WorkIdentity {
  userId: string;
  displayName: string;
  groups: string[];
}
```

Each component accepts an `identity` prop of type `WorkIdentity`. The inbox uses `userId` to filter "My Work" and `groups` to filter "Claimable". The detail panel uses `userId` as the actor for claim/delegate/complete actions. The queue board uses `groups` for scope filtering.

### pages `configure()` Lifecycle

When hosted via pages `hostPanel`, the runtime calls `panel.configure(props)` **before** the element is appended to the DOM (before `connectedCallback`). Components must:

1. Accept `configure(props)` and store configuration without triggering rendering
2. Defer initial data fetch and render to `connectedCallback` — by which point `configure()` has already set `endpoint`, `identity`, and any other props
3. Support `configure()` being called again after initial render (e.g., navigation to a different work item) — re-render with the new props

When used standalone (not via `hostPanel`), components accept the same props as HTML attributes or property assignments in the standard Web Component way.

### User Search Provider

Delegation requires searching for users and groups. Since identity systems vary across deployments (SCIM, LDAP, custom), components accept an optional `userSearchProvider` callback:

```typescript
type UserSearchProvider = (query: string) => Promise<Array<{id: string, displayName: string, type: 'user' | 'group'}>>;
```

If not provided, the delegate action shows a plain text input for the target user/group ID.

## 3. Work Item Inbox (`<work-item-inbox>`)

### Layout — Three Zones

**Summary bar:** Compact metric badges — total items, by priority (urgent/high/medium/low), overdue count, claim-deadline-breached count. Sourced from `/workitems/inbox/summary`. Clicking a badge filters the list.

**Filter/sort bar:** Status filter chips, priority filter, category dropdown, candidate group selector. Active filters as dismissible pills. Sort toggle on column headers.

**Item list:** Each row shows:

| Field | Treatment |
|-------|-----------|
| Title | Primary text, truncated with tooltip |
| Priority | Colour-coded left border (urgent=danger-9, high=warning-9, medium=accent-9, low=neutral-7) |
| Status | Pill badge |
| SLA/Deadline | Inline `<sla-indicator>` — countdown with colour shift |
| Category | Subtle text label |
| Candidate group | Shown in claimable view, hidden in assigned view |
| Age | Relative timestamp |

### Two Modes

- **My Work** — items where the current user is assignee or delegation target and `status.isActive() == true` (PENDING, ASSIGNED, IN_PROGRESS, SUSPENDED, DELEGATED). DELEGATED items appear here when someone delegates TO the current user — they need to accept or decline.
- **Claimable** — items in the user's candidate groups that are PENDING

Toggled by tabs at the top of the component.

### Interaction

- Arrow keys navigate rows (roving tabindex)
- Enter/click emits `work-item-selected` event
- `C` key claims the focused item inline (optimistic update with slide animation)
- Multi-select via Shift+click or Shift+Arrow for batch operations (see Batch Operations below)
- SSE: new items animate in (fade + slide from top), completed items animate out (fade + slide right)

### Batch Operations

When 2+ items are selected, a floating action bar appears at the bottom of the inbox with the available batch actions:

| Context | Available batch actions |
|---------|----------------------|
| Claimable view | Batch Claim |
| My Work view | Batch Cancel |

Actions call `POST /workitems/bulk` with `BulkRequest(operation, workItemIds, actorId, reason)`. Maximum batch size: 100 items (backend-enforced).

**Partial failure handling:** The bulk endpoint returns per-item results (`{id, status, error}`). The UI shows:
1. During execution: progress indicator ("Claiming 10 items...")
2. On full success: toast "10 items claimed" + all rows animate to My Work
3. On partial failure: toast "7 of 10 claimed — 3 failed" with an expand link showing per-item error messages. Failed items remain selected with a brief danger highlight. Succeeded items animate normally.

Cancel confirmation applies to the entire batch: "Cancel 5 items? This cannot be undone." with an optional reason field.

### Responsive

- **Full (>768px):** All columns visible, horizontal row layout
- **Medium (480–768px):** Category and candidate group hidden, tighter spacing
- **Compact (<480px):** Card layout — each item as a stacked card, priority as full-width top border

### Virtual Scrolling

For compliance-heavy apps (AML) where inbox depth may reach hundreds of items, the inbox uses virtual scrolling: only visible rows plus a buffer are rendered in the DOM. Implementation uses a sentinel element at the scroll boundary to trigger loading of the next window. The full item list is held in memory (sourced from the REST fetch + SSE patches); only DOM rendering is virtualised.

Threshold: virtual scrolling activates when item count exceeds 50. Below that threshold, all rows render directly.

### Empty States

Contextual: "No claimable items — all caught up" vs "No items match your filters — try removing the 'urgent' filter"

## 4. Work Item Detail (`<work-item-detail>`)

### Layout — Vertical Scroll with Sticky Header

**Header (sticky):** Title, status pill, priority badge, SLA indicator (prominent countdown).

**Action bar (sticky):** Contextual buttons based on current status:

| Current status | Available actions |
|----------------|-------------------|
| PENDING | Claim, Escalate |
| ASSIGNED | Start, Release, Delegate, Escalate |
| IN_PROGRESS | Complete, Reject, Suspend, Delegate, Escalate |
| SUSPENDED | Resume, Cancel, Escalate |
| DELEGATED | Accept Delegation, Decline Delegation |
| COMPLETED | (read-only — no actions) |
| REJECTED | (read-only — no actions) |
| FAULTED | (read-only — shows system error context) |
| CANCELLED | (read-only — no actions) |
| EXPIRED | (read-only — shows SLA breach info) |
| ESCALATED | (read-only — shows escalation chain) |
| OBSOLETE | (read-only — shows supersession reason) |

**Terminal states:** All 7 terminal statuses (COMPLETED, REJECTED, FAULTED, CANCELLED, EXPIRED, ESCALATED, OBSOLETE) render a read-only detail view. The action bar is replaced by a terminal status banner showing the terminal status, the actor who triggered it (or "system" for FAULTED/EXPIRED), and the timestamp. FAULTED gets a distinct error-styled banner (danger colour) since it represents system failure, not a user decision.

**Escalate:** Available from any active state. Opens a confirmation dialog with target group selector (combobox) and reason text field. Calls `PUT /workitems/{id}/escalate` with `EscalateRequest(targetGroup, reason)`.

**DELEGATED actions:** When the current user is the delegation target, shows Accept Delegation and Decline Delegation buttons. Accept calls `PUT /workitems/{id}/accept-delegation?claimant={userId}` (transitions to ASSIGNED). Decline calls `PUT /workitems/{id}/decline-delegation?actor={userId}` (transitions to PENDING or back to delegator per `delegationDeclineTarget`). When the current user is the delegator, shows read-only "Delegated to {target}" status with pending acceptance indicator.

Confirmation step for destructive operations (Reject, Cancel, Escalate) but not for forward-progress ones (Claim, Start, Complete). Complete prompts for outcome selection when `permittedOutcomes` is set.

**Content area — three tabs:**

| Tab | Content |
|-----|---------|
| **Overview** | `<schema-form mode="display">` for payload from `inputDataSchema`. Named slot `payload-renderer` for domain-specific override. Also: assignee, candidate groups, owner, timestamps, scope, confidence score. |
| **Activity** | Timeline of status changes, notes, delegation events. Actor, action, timestamp, rationale. Add-note form. Newest-last. |
| **Relations** | Parent work item (clickable), child tasks with progress, linked cases, external links. |

**Metadata footer:** ID, template ref, form key, labels as chips, schema info. Collapsed by default.

### Interaction

- Keyboard shortcuts shown as hints: `C` claim, `S` start, `E` complete, `R` reject
- Optimistic updates — UI transitions immediately, rolls back on failure with toast
- Delegate: combobox overlay to search/select target user or group
- Complete with outcome: radio group of `permittedOutcomes` + `<schema-form mode="edit">` for `resolution` data from `outputDataSchema`. The form output binds to `CompleteRequest.resolution`; the selected outcome binds to `CompleteRequest.outcome`.

### Responsive

- **Full (>768px):** Horizontal tab bar, full content width
- **Medium (480–768px):** Same layout, tighter spacing
- **Compact (<480px):** Tabs become dropdown/segmented control, action bar collapses to "Actions" button opening a bottom sheet

### Empty State

When no work item is selected (initial load on desktop, or after navigating back from a completed item), the detail panel shows a centred empty state: a subtle icon (clipboard or inbox), the text "Select a work item to view details", and keyboard hint "Use arrow keys to navigate the inbox, Enter to select."

## 5. Queue Board (`<queue-board>`)

### Dashboard Mode (Default)

Responsive grid of queue cards. Each card displays summary data **computed client-side** from the full item list returned by `GET /queues/{id}`:

| Element | Treatment | Derivation |
|---------|-----------|------------|
| Queue name | Card title | From queue definition |
| Total items | Large prominent number | `items.length` |
| Priority breakdown | Micro bar chart — 4 segments, proportional width, colour-coded | Group by `priority` field |
| SLA health | "3 breached" in danger colour, or green checkmark | Count items where `expiresAt < now` and `status.isActive()` |
| Oldest item age | Subtle secondary text ("oldest: 4d 2h") | `min(createdAt)` across active items |

The queue API (`GET /queues/{id}`) returns the full item list; summary metrics are derived in the component. This is acceptable for typical queue sizes (tens to low hundreds). For queues exceeding ~500 items, a server-side summary endpoint would improve initial load time — filed as casehub-work enhancement.

**Dashboard loading strategy:** On initial load, `GET /queues` fetches queue definitions first (fast — just metadata). Then item lists are fetched concurrently via `Promise.all([...queueIds.map(id => fetch(`/queues/${id}`))])`. Each card shows a loading skeleton (pulsing neutral-3 background with placeholder shapes for count, priority bar, and age) until its fetch completes. Cards render independently as their data arrives — a slow queue doesn't block fast ones. For dashboards with many queues (>6), below-the-fold cards defer their fetch until scrolled into view (IntersectionObserver).

Cards sorted by urgency: SLA breaches first, then by count descending. Cards with breaches get a subtle pulsing left border in danger colour.

Grid reflows: 3 columns desktop, 2 tablet, 1 phone.

### List Mode

Clicking a queue card expands to a full item list using `<work-item-row>` — the same shared row component consumed by the inbox. Back navigation returns to dashboard with the selected card briefly highlighted.

### Interaction

- Arrow keys navigate cards in dashboard mode (grid navigation)
- Enter transitions to list mode (expand animation)
- Escape returns to dashboard
- In list mode, selecting an item emits `work-item-selected`
- SSE connection strategy: dashboard mode subscribes to ONE global SSE stream (`/workitems/events`). When a lifecycle event arrives, the component checks which cached queue item lists are affected and recomputes summary metrics. Queue-specific SSE streams (`/queues/{id}/events`) are opened only when a queue is expanded to list mode — closed when returning to dashboard. This limits SSE connections to 1 in dashboard mode regardless of queue count, avoiding the HTTP/1.1 6-connection-per-origin limit.
- **Dashboard freshness:** The global SSE stream detects state changes on cached items but cannot detect new items entering or leaving queues (queue membership is evaluated server-side by JEXL filters — only queue-specific streams emit ADDED/REMOVED events). To maintain freshness without per-queue SSE connections: visible queue cards re-fetch their item list every 30 seconds in the background. Each card shows a "last updated" timestamp (subtle secondary text, e.g. "updated 12s ago"). A manual refresh button on each card triggers an immediate re-fetch. Background re-fetches are staggered (not all at once) and suppressed when the browser tab is hidden (`document.hidden`).
- Count changes animate (odometer), cards reorder on urgency change

### Responsive

- **Full (>768px):** 3-column card grid, full priority bar
- **Medium (480–768px):** 2-column grid, priority as coloured dots
- **Compact (<480px):** Single column, full-width horizontal strips

## 6. Work Item Workbench (`<work-item-workbench>`)

The composed experience orchestrating inbox + detail + queue board with responsive layout, transitions, and keyboard flow.

### Desktop (>1024px) — Split Pane

Left panel toggles between inbox and queue board via tabs. Right panel shows detail for selected item. Divider is draggable (ratio persisted to localStorage). Keyboard hint bar at bottom.

Selecting an item: detail panel content cross-fades (~200ms).
From queue board: clicking a queue expands to list in left panel, selecting shows detail in right.

### Tablet (480–1024px)

- **768–1024px:** Narrow split pane, compact inbox left, detail right
- **480–768px:** Full-width left panel. Selecting an item slides detail in as overlay from right (~250ms ease-out). Back/swipe dismisses.

### Phone (<480px) — Navigation Stack

Full-screen views with push/pop transitions (slide left to enter, slide right to go back). Bottom tab bar switches between Inbox and Queues. Gesture support (swipe from left edge to go back).

### Keyboard Flow (Desktop)

- Arrow up/down: navigate inbox rows
- Enter: open/focus detail panel
- Escape: return focus to inbox
- `C`/`S`/`E`/`R`: act on focused item
- Tab: move between panels
- `?`: keyboard shortcut overlay
- `/`: focus filter/search bar

### Motion Design

- **Item claim:** row slides right and fades, reappears in "My Work" with a subtle glow that fades over 1s
- **Status change:** pill badge morphs colour (200ms transition)
- **SSE new item:** slides in from top with brief highlight
- **Panel transitions:** cross-fade content (not hard-mount/unmount)
- **Queue card count change:** digits roll like an odometer
- **Theme switch:** smooth full-UI transition via CSS custom property transition (~300ms)

### `prefers-reduced-motion`

All motion effects degrade gracefully when the user's OS has reduced motion enabled:

| Motion | Reduced behaviour |
|--------|------------------|
| Item claim slide + glow | Instant opacity swap, no slide |
| Status pill colour morph | Instant colour change |
| SSE new item slide-in | Instant appear with brief highlight |
| Panel cross-fade | Instant swap |
| Queue card odometer | Instant number update |
| Theme switch transition | Instant token swap |
| Phone push/pop slides | Instant swap |

Implementation: wrap all `transition` and `animation` CSS in `@media (prefers-reduced-motion: no-preference) { ... }`. The reduced-motion path uses `transition-duration: 0s` — layout shifts still happen, but smoothly rather than with motion.

### Density Toggle

Switch between comfortable and compact. Persisted to localStorage. Token swap — layout doesn't change, spacing and font sizes adjust.

## 7. Schema Form (`<schema-form>`)

Shared primitive in blocks-ui-core for rendering work item payloads and capturing completion output.

### Two Modes

- **Display:** Read-only structured layout from JSON Schema + data. Well-formatted labels, values, and nested sections.
- **Edit:** Input widgets, validation, submit. Used for output data capture on completion.

### Built-in Field Types

| JSON Schema type | Display mode | Edit mode |
|-----------------|-------------|-----------|
| `string` | Formatted text | Text input (textarea when `maxLength > 200`) |
| `number` / `integer` | Formatted number | Number input |
| `boolean` | "Yes" / "No" label | Checkbox toggle |
| `enum` | Selected value as label | Select dropdown |
| `string` with `format: "date"` | Formatted date | Date picker |
| `string` with `format: "date-time"` | Formatted datetime | Datetime picker |
| Nested `object` | Indented section with recursive rendering | Recursive form section |
| `array` of primitives | Comma-separated values | Tag input with add/remove |

Handles flat payloads (80% of cases) and nested objects with recursive rendering. Advanced JSON Schema features (conditionals, `$ref`, `allOf`/`anyOf`, `dependencies`) are deferred to the plugin API — not in scope for the built-in renderer.

### Plugin API

`registerFieldRenderer(format, component)` — apps register custom renderers for specific JSON Schema `format` values or `formKey` mappings. Unrecognised types fall back to formatted JSON — never breaks.

### Slot Override

The detail panel's named slot `payload-renderer` still works for apps that want to bypass schema-form entirely and render their own thing.

## 8. SSE Infrastructure & Data Layer

### SSE Connection Manager (blocks-ui-core)

- **Connection pooling:** One EventSource per endpoint, shared across components
- **Auto-reconnect:** Exponential backoff (1s, 2s, 4s, max 30s) with visual connection-status indicator
- **Event dispatching:** SSE events normalised and dispatched to subscribed components. SSE is the single source of truth for data state changes — pages-events handle only navigation/selection (see §9)
- **Backpressure:** Batch rapid updates into animation frames

### Data Fetching Pattern

1. Initial load: REST fetch
2. Live updates: SSE subscription patches local state
3. Optimistic actions: UI updates immediately, REST fires async, rollback on failure

### SSE Event → UI Action Mapping

The backend emits 25 `WorkEventType` values. Components group these into UI operations rather than handling each individually:

| UI operation | Events | Inbox effect | Detail effect |
|-------------|--------|-------------|--------------|
| **Item appears** | CREATED, ASSIGNED (to me), SLA_REASSIGNED (to my group) | Add row with entry animation | — |
| **Item disappears** | COMPLETED, REJECTED, FAULTED, CANCELLED, OBSOLETE, EXPIRED, ESCALATED | Remove row with exit animation | Show terminal banner if viewing this item |
| **Item updated** | STARTED, SUSPENDED, RESUMED, RELEASED, DELEGATED, DELEGATION_ACCEPTED, DELEGATION_DECLINED, PROGRESS_UPDATE, DEADLINE_EXTENDED, SLA_EXTENDED, MANUALLY_ESCALATED | Refresh row in place | Refresh detail view, update status pill |
| **Label change** | LABEL_ADDED, LABEL_REMOVED | Refresh if label affects current filter | Refresh labels display |
| **Metadata only** | SPAWNED, SIGNAL_RECEIVED, CLAIM_EXPIRED | No visual change in list | Refresh activity timeline if viewing this item |

Queue board in **dashboard mode**: subscribes to the global `/workitems/events` stream (single connection). When a lifecycle event arrives for an item in a cached queue, the component re-evaluates that queue's summary metrics. Queue board in **list mode**: additionally subscribes to `/queues/{id}/events` for the expanded queue, which emits ADDED/REMOVED/CHANGED — these map directly to item list updates. The queue-specific connection is closed when returning to dashboard mode.

**DELEGATION_DECLINED** specifically: if the current user is the delegator, the item returns to their inbox (ASSIGNED status). If the decline target is POOL, the item returns to PENDING in the claimable view.

**CLAIM_EXPIRED**: no visual change to the item itself, but the inbox summary badge for "claim deadline breached" should update.

### Error Handling

- SSE disconnect: show last-known state + "Live updates paused" indicator
- REST action failure: optimistic rollback + toast with retry
- Network offline: disable actions with visual indicator

### Caching

- Work item detail: cached by ID, instant navigation, background refresh
- Inbox list: not cached, always reflects server state via SSE
- Queue summaries: cached 5s to avoid redundant fetches during rapid navigation

## 9. pages-event Contract

All inter-component communication uses the `pages-event` CustomEvent with `{topic: string, payload: unknown}` detail structure. Components dispatch on `document` with `bubbles: true, composed: true`.

### Event Topics

pages-events handle **navigation and UI coordination only**. Data state changes flow exclusively through SSE — this eliminates double-processing (the detail panel's optimistic update is local; the inbox receives the authoritative state change via SSE within ~200ms).

| Topic | Emitted by | Payload | Purpose |
|-------|-----------|---------|---------|
| `work-item.selected` | Inbox, Queue Board list mode | `{workItemId: string}` | Navigate detail panel to this item |
| `work-item.deselected` | Inbox | `{}` | Clear detail panel (return to empty state) |
| `queue.selected` | Queue Board | `{queueId: string, queueName: string}` | Workbench switches left panel to queue list mode |
| `queue.deselected` | Queue Board | `{}` | Workbench returns left panel to dashboard mode |

**What pages-events do NOT carry:** Data state changes (claimed, completed, delegated, escalated, status-changed). These arrive via SSE, which is the single source of truth for item state across all components. The detail panel does optimistic updates for its own display (immediate visual feedback), but does not broadcast state changes to sibling components — the SSE stream handles that authoritatively.

### Listening Convention

Components listen on `document` for pages-events they consume. Each component independently subscribes to its relevant SSE stream for data state updates. The workbench orchestrates navigation events and routes between child components. Standalone components (no workbench) still communicate — both inbox and detail panel listen on `document` for navigation and on their SSE subscriptions for state.

## Cross-App Consumption

Each CaseHub app uses these components differently:

| App | Primary use | Custom payload rendering |
|-----|------------|------------------------|
| AML | Compliance officer inbox with 30-day FinCEN SLA | Investigation findings, entity resolution, SAR drafts |
| Clinical | PI authorisation gates, safety officer SUSAR review | Adverse event detail, protocol deviation context |
| Life | Household task management, family vote quorum | Contractor quotes, appointment details |
| IoT | Device situation response, human decision points | Device state, situation context |
| DevTown | PR review triage, code review assignment | PR diff summary, capability scores |

## Token Extraction Plan

Tokens are bootstrapped in blocks-ui-core using a Radix 12-step scale (`--blocks-accent-1` through `--blocks-accent-12`). Pages currently has a flat token system (`--pages-accent`, `--pages-bg`, etc. — 13 tokens in `pages-viz/src/base/theme.ts`).

These are architecturally different: 12-step semantic scales vs flat named values. The extraction plan accounts for this:

1. Extract 12-step token definitions to a `pages-ui-tokens` package with `--pages-` prefix
2. blocks-ui-core imports from `pages-ui-tokens` instead of defining its own
3. Add **compatibility aliases** in `pages-ui-tokens` that map the existing flat tokens to 12-step equivalents: `--pages-accent` → `--pages-accent-9`, `--pages-bg` → `--pages-neutral-1`, `--pages-text` → `--pages-neutral-12`, etc.
4. Existing pages-viz components continue working via the aliases — no changes needed
5. New components and gradual migration use the full 12-step system directly

The 12-step system is the architectural future for pages. The flat tokens become aliases, not the primary API. blocks-ui components will need their `--blocks-` prefixes updated to `--pages-` on extraction, but the step numbers and semantic mapping remain identical.
