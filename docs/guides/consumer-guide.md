# casehub-blocks-ui — Consumer Guide

> Shared, domain-aware UI components for CaseHub applications — compose blocks into domain-specific dashboards without coupling to any single app's model.

**GitHub:** [casehubio/blocks-ui](https://github.com/casehubio/blocks-ui)
**Tier:** Platform (shared UI layer)

---

## Purpose

blocks-ui provides reusable Web Components that multiple CaseHub applications share. Each component consumes `casehub-pages` APIs (`registerPanel`, `pages-event`, dataset contracts) but knows nothing about a specific app's domain model.

Domain-aware but app-agnostic — components know about trust scores, case timelines, channel activity, work items, and audit trails, but not about AML investigations, clinical trials, or governance processes. Applications compose these blocks into domain-specific dashboards.

---

## Module Structure

### Core Packages (`packages/`)

| Package | npm name | Purpose | Maturity |
|---------|----------|---------|----------|
| `packages/blocks-ui-core` | `@casehubio/blocks-ui-core` | Tokens, DataSourceMixin, TrendSourceMixin, renderSparkline, EventStreamController, event helpers, domain types, SharedTimerController, blocks-confirm-dialog, renderPropertyTree, pulseAnimation CSS, CommitmentStatePill, StatusBadge (generic status pills), status registry (`lookupStatus`/`registerStatus`) | Beta |
| `packages/graph-stencil-case` | `@casehubio/graph-stencil-case` | Case domain adapter, structural stencils (binding, worker with function type badge, milestone, goal, subcase), YAML editor (add/remove/edit/switchTarget/switchFunctionType/switchMcpTransport/switchModelProvider), worker-function module (type detection, config interfaces, form renderers), RuntimeAdapter (`toDecorations`), persistence SPI (`GitHubBackend`). | Beta |
| `packages/diagram-core` | `@casehubio/diagram-core` | Shared diagram orchestration — DiagramBaseMixin (undo/redo, render pipeline, persistence, keyboard shortcuts, error/degraded/readonly modes), DiagramToolbar, DiagramProperties, form utilities. | Beta |
| `packages/graph-stencil-swf` | `@casehubio/graph-stencil-swf` | SWF domain adapter (`toSwfGraph` — dual YAML walk with SDK `buildFlatGraph`, type prefixing, degraded mode), 10 typed stencils + generic fallback, edge types (flow, switch-case), `applySwfPropertyEdit`, `swfTaskSchema`, `createSwfThumbnailRenderer`. Uses `@openworkflowspec/sdk`. | Beta |

### Components (`components/`)

| Component | Purpose | Maturity |
|-----------|---------|----------|
| `split-workbench` | Generic split-pane layout shell — draggable divider, localStorage-persisted ratio, CSS container query responsive mode (single-panel below 768px), selection coordination via pages-event topics | Beta |
| `list-pane` | Data list wrapping `<pages-table>` — paginated mode, single selection, client-sort/filter, emits selection events | Beta |
| `detail-pane` | Tabbed detail view — lazy tab panel creation, keyboard tab navigation, receives selected item via topic events | Beta |
| `grouped-data-view` | Grouped data view — items grouped by column key with per-group pages-table rendering | Beta |
| `work-item-inbox` | Work item inbox — queue pill bar, filter bar, SSE lifecycle, three-tab perspective (My Work / Claimable / All) | Beta |
| `work-item-detail` | Work item detail panel — action bar, activity tab, relations tab with semantic type inverses | Beta |
| `work-item-workbench` | Full workbench — split-pane layout with inbox and detail, keyboard shortcuts | Beta |
| `notification-inbox` | Notification inbox — bell with unread badge, inbox with tabs/filters/SSE, subscription list CRUD | Beta |
| `sla-indicator` | SLA deadline indicator — countdown, breach state, escalation badge, threshold-based colour transitions | Stable |
| `kpi-metric-row` | KPI metric cards — responsive grid with sparklines, trends, status colours, density property | Stable |
| `approval-gate` | Approval gate — structured decision point with quorum, evidence slots, SLA integration | Beta |
| `audit-trail-viewer` | Audit trail viewer — ledger entries with pages-table, Merkle verification banner, attestations, filters, GDPR erasure handling | Beta |
| `blocks-timeline` | Pluggable timeline — vertical, horizontal, compact layouts with strategy-based content | Beta |
| `trust-score-panel` | Agent trust score visualisation — Bayesian Beta scores, trend lines, per-capability breakdown | Beta |
| `channel-activity` | Qhorus channel activity — message feed, channel nav, member panel, speech-act badges | Beta |
| `commitment-viz` | Commitment lifecycle visualization — state pills, transition badges, range bars | Beta |
| `similarity-panel` | Similar past cases — similarity scores, outcomes, resolution times via pages-table | Beta |
| `compliance-summary` | Regulation compliance grid — status badges, evidence links via pages-table | Beta |
| `trust-feedback-display` | Post-gate trust score delta — decision, attestation, trust before/after with compact mode | Beta |
| `sla-breach-policy` | SLA breach escalation tiers — active tier highlighting, optional live countdown | Beta |
| `gdpr-erasure-action` | GDPR data erasure form — subject lookup, reason selection, confirmation dialog, receipt | Beta |
| `case-explorer` | Composable case explorer — universal entity browser with registration, state/command SPI, management actions | Beta |
| `preferences-editor` | Preferences editor — tree-table UI for scope-aware preference management | Beta |
| `routing-rationale` | Trust-weighted routing decision explanation — score vs threshold, alternatives, phases | Beta |
| `session-list` | Session list — filterable session table with status badges | Beta |
| `session-detail` | Session detail panel — session metadata, activity log, state display | Beta |
| `session-workbench` | Session workbench — split-pane layout with session list and detail panels | Beta |
| `execution-monitor` | Execution monitor — SSE-driven live execution state with agent roster | Beta |
| `orchestration-workbench` | Orchestration workbench — execution monitor + audit timeline in split-workbench | Beta |
| `trust-workbench` | Composite trust visibility — score panel, routing history, feedback display | Beta |
| `document-workbench` | Document review workbench — 9 panels for AI-assisted document review: debate feed, document diff, timeline, review tracker, brainstorm options/picker, context gauge, doc picker, workspace status | Beta |
| `conversation-viewer` | Conversation protocol viewer — convergence indicator, common ground panel, point list, point detail, conversation workbench. Structured deliberation UI with property-based data delivery. | Beta |
| `casehub-diagram` | Visual diagram editor for CaseDefinition YAML — extends DiagramBaseMixin, case-specific palette, property panel with binding target selector + worker function type editor (agent/a2a/mcp/sequence/flow sub-forms, pop-out prompt dialog), structural editing, runtime overlay with status badges, worker inline expand | Beta |
| `swf-diagram` | Standalone SWF workflow diagram — extends DiagramBaseMixin, schema-driven property editing, degraded mode banner. Read-only + property editing (no structural editing). | Beta |
| `work-item-row` | Single work item row (legacy — inbox now uses pages-table) | Deprecated |

**Maturity levels:**
- **Stable** — API locked, used in production apps, full test coverage
- **Alpha** — scaffold or stub; adapter methods return empty models, stencils defined but not yet rendered
- **Beta** — API stable, tests exist, used in staging apps or feature-flagged in prod
- **Deprecated** — being replaced, do not use in new code

---

## Key Components for App Builders

### split-workbench + list-pane + detail-pane

Generic split-pane architecture replacing the monolithic work-item-workbench pattern. Three composable components:
- `<split-workbench>` — draggable divider, responsive single-panel mode, selection coordination via topic events. Accepts children via named slots (`list`, `detail`, `header`).
- `<list-pane>` — wraps `<pages-table>` with DataSourceMixin, emits selection events
- `<detail-pane>` — lazy tab panel creation via `TabDefinition[]`, receives items via selection events

New compositions should use split-workbench + list-pane + detail-pane (work-item-workbench still exists but is the older pattern).

### grouped-data-view

Grouped tabular data with configurable visual modes — three presets (sectioned, spreadsheet, list) via `<pages-grouped-view>`. Custom group ordering, styling callbacks, expand/collapse.

### channel-activity

Qhorus channel activity — eight sub-elements covering the full messaging lifecycle: feed (message grouping, threading, auto-scroll), individual messages, reactions, input with speech-act type selector, emoji picker, threaded replies, channel navigation (sidebar/dropdown modes), member panel with presence. DOMPurify + marked for markdown rendering. Extension points: `formatSender`, `renderContent`, `renderContextHeader`, `renderError`, `allowedTypes`/`deniedTypes` filtering, `showCreate`/`showDelete` toggles, `messageCounts`.

### notification-inbox

Notification UI — bell with unread badge, inbox with tabs/filters/SSE, subscription list CRUD, subscription editor (schema-driven form), channel preferences (per-channel delivery mode/digest/groupBy/quiet hours), mute list, snooze control, notification preferences container.

### status-badge

Generic status pill for any domain's state enum. Replaces ad-hoc `_statusColors` records. Uses the status registry (`lookupStatus`) for state-to-category mapping and `stateCategoryStyles()` for colours.

```html
<status-badge domain="case" state="RUNNING" showIcon></status-badge>
<status-badge domain="workitem" state="ASSIGNED" size="md"></status-badge>
<status-badge state="COMPLETED"></status-badge> <!-- cross-domain default -->
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `state` | `string` | — | The state value to display |
| `domain` | `string` | — | Optional domain for domain-specific rendering |
| `size` | `'sm' \| 'md'` | `'sm'` | Pill size |
| `showIcon` | `boolean` | `false` | Show state icon |

Built-in domains: `case`, `task`, `workitem`, `work`, `milestone`, `outcome`, `group`, `sla`, `node`, `session`, `commitment`.

### audit-trail-viewer

Ledger entry viewer — pages-table rendering, Merkle verification banner, attestations, actor/type/date filters, GDPR erasure handling.

### blocks-timeline

Pluggable timeline — strategy-based content with three strategies: event chronology, state progression, commitment lifecycle. Three layouts (vertical, horizontal, compact), render callback resolution, temporal weighting. Strategy-declared pagination (load-more in vertical layout).

### trust-score-panel

Trust score visualisation — SVG gauge, per-capability breakdown table, trend sparkline (via TrendSourceMixin), maturity badges, compact badge mode.

### case-explorer

Composable case explorer — universal entity browser with registration-based entity types. Generic sub-components: entity-list, entity-detail (three-tier renderer resolution), entity-tree (collapsible hierarchy, ARIA tree, lazy loading), entity-command-bar (dynamic commands with confirmation). Presets for case instances, workers, case definitions, gates, and channels. Domain customisation via `columnRenderers`, `detailRenderer`, `detailRendererMap`, `nodeRenderer`, `filters`.

### document-workbench

Document review workbench for AI-assisted document review workflows. Nine panels:

| Element | Tag name | Purpose |
|---------|----------|---------|
| DebateFeed | `<debate-feed>` | Streaming debate entries with round dividers, agent labels (REV/IMP/HUMAN/SUPERVISOR/MODERATOR/SELECTOR), entry types (RAISE/AGREE/COUNTER/DISPUTE/QUALIFY/FLAG_HUMAN/DECLINED/MEMO/SUB_TASK_*/RESTART_CONTEXT/COMMENT/HUMAN_OVERRIDE/REPRIORITISE/VERIFIED/DEFERRED), auto-scroll, point selection |
| DocumentDiff | `<document-diff>` | Side-by-side markdown diff viewer with split/unified modes, line-level and word-level diff highlighting, scroll sync via heading anchors, minimap in divider gutter, diff navigation (next/prev), drag-and-drop file loading, section highlight/scroll-to-location API |
| DocumentTimeline | `<document-timeline>` | Horizontal snapshot timeline for debate rounds — click/shift-click to select comparison range, review-tracker trail highlight integration |
| ReviewTracker | `<review-tracker>` | Review point tracker derived from debate entries — progress bar, point status (OPEN/ACTIVE/AGREED/PENDING_HUMAN/DECLINED/DISPUTED/VERIFIED/DEFERRED/HUMAN_OVERRIDE), filter resolved, agent trail, inline comment/override/priority actions, batch accept/defer for low-priority points |
| ContextGauge | `<context-gauge>` | LLM context window usage indicator — percentage bar with threshold warning, tooltip with contribution/window/message stats |
| DocPicker | `<doc-picker>` | Document slot picker dropdown — select documents for A/B comparison, updates via `documents-changed` and `comparison-changed` events |
| BrainstormOptions | `<brainstorm-options>` | Brainstorm option cards — display/recommend/eliminate/select options, converged/ended states, status badges |
| BrainstormPicker | `<brainstorm-picker>` | Brainstorm session switcher dropdown — lists active sessions, emits `brainstorm-session-selected` |
| WorkspaceStatus | `<workspace-status>` | Agent workspace progress indicator — elapsed timer, agent status text, round/cost tracking, terminal state dot |

All document-workbench panels use `configure(props)` for hostPanel integration and listen to pages-event topics for streaming data.

### session-workbench

Session workbench for claudony session management — composes session-list + session-detail in split-workbench. Session-list provides status badges (ACTIVE/WAITING/IDLE), inline spawn form, delete/restart actions. Session-detail provides tabbed view with Terminal (polling), Git (branch/PR/checks), Health (port status), Events (SSE) tabs.

### commitment-viz

Commitment lifecycle visualization — transition badges (`commitment-transition-badge`), range bars (compact/detailed modes), `decorateCommitmentRanges` pure function for feed decoration metadata. Uses the 7-state commitment model (OPEN/ACKNOWLEDGED/FULFILLED/FAILED/DECLINED/DELEGATED/EXPIRED). Props-driven, decoupled from channel-activity.

### conversation-viewer

Conversation protocol viewer — structured deliberation UI rendering convergence state, epistemic common ground, and conversation points. The protocol lens over structured conversations that raw message feeds (channel-activity) and document-specific views (document-workbench) do not provide.

Five components:
- `<blocks-convergence-indicator>` — horizontal status bar showing convergence state (colour) and confidence (fill level). Sizes: `sm` (inline) and `md` (full with label).
- `<blocks-common-ground-panel>` — three-column layout partitioning facts by epistemic status (Established / Pending / Disputed). Responsive collapse below 500px.
- `<blocks-point-list>` — scrollable list of conversation points grouped by round, with single-selection via pages-event topics.
- `<blocks-point-detail>` — thread view for a single point showing entry cards, sub-task findings, obligation chains (via commitment-viz), and flags.
- `<blocks-conversation-workbench>` — convenience split-workbench wrapper composing all panels. Left: convergence indicator + point list. Right: point detail (when selected) or common ground panel (when not). KeyboardShortcutMixin (Escape deselects), LiveRegionMixin for accessibility, stale selection guard, `configure()` for hostPanel integration.

Data delivery is property-based (`conversationState: ConversationState`) — host app owns fetching. Extension points via render callbacks (`renderPoint`, `renderEntry`, `renderFact`) per PP-20260713-8ea1af.

### casehub-diagram

Visual diagram editor for CaseDefinition YAML. Renders case definitions as interactive node graphs with ELK auto-layout.

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `yaml` | `string` | Inline YAML source |
| `src` | `string` | URL to fetch YAML from |
| `backend` | `PersistenceBackend \| null` | Persistence SPI for load/save (e.g. `GitHubBackend`) |
| `uri` | `string` | Resource URI for the backend |
| `schema` | `Record<string, unknown>` | CaseDefinition JSON Schema for property panel |
| `runtimeState` | `CaseRuntimeState \| null` | Live execution state — enables runtime overlay |

**Runtime overlay:** Set `runtimeState` to project live execution state onto the graph as visual decorations (status badges, borders, tooltips). The component is transport-agnostic — the host application owns data delivery (REST polling, SSE, WebSocket) and passes the snapshot as a property.

```typescript
interface CaseRuntimeState {
  readonly planItems: readonly PlanItemSnapshot[];
  readonly milestones: readonly MilestoneSnapshot[];
  readonly timestamp: string;  // ISO 8601
}

interface PlanItemSnapshot {
  readonly id: string;
  readonly bindingName: string;
  readonly status: TaskStatus;
  readonly createdAt: string;  // ISO 8601
}

interface MilestoneSnapshot {
  readonly name: string;
  readonly status: MilestoneLifecycleStatus;
}
```

`TaskStatus`: PENDING, RUNNING, DELEGATED, SUSPENDED, COMPLETED, FAULTED, REJECTED, OBSOLETE, CANCELLED (9 states). `MilestoneLifecycleStatus`: PENDING, ACTIVE, COMPLETED (3 states).

When `runtimeState` is set, a design/runtime mode toggle appears in the toolbar. In runtime mode, binding nodes show aggregated PlanItem status badges (active-worst-first priority) and milestone nodes show lifecycle badges. Setting `runtimeState` to `null` reverts to design-only mode.

Staleness: if `timestamp` is older than 30 seconds, a stale indicator appears in the toolbar. The component does not poll — staleness is evaluated on each `runtimeState` update.

**Custom overlay use:** For apps that need decorations outside the component (e.g. a secondary status panel), `toDecorations(state)` is exported from `@casehubio/graph-stencil-case`:

```typescript
import { toDecorations } from '@casehubio/graph-stencil-case';
const decorations = toDecorations(runtimeState);
// Map<string, NodeDecoration> keyed by node ID
```

**Editing:** All editing capabilities (property panel, palette, delete, save, undo/redo) remain active in runtime mode. The overlay is purely visual.

### swf-diagram + graph-stencil-swf

Standalone SWF workflow diagram component. `swf-diagram` extends `DiagramBaseMixin` from `diagram-core` and delegates to `graph-stencil-swf` for adapter, stencils, property editing, and schema.

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `yaml` | `string` | SWF YAML string to render |
| `src` | `string` | URL to fetch SWF YAML from |
| `backend` | `PersistenceBackend \| null` | Optional persistence backend |
| `uri` | `string` | Resource URI for persistence |
| `schema` | `Record<string, unknown>` | JSON Schema — defaults to `swfTaskSchema` (self-sufficient) |
| `readonly` | `boolean` | When true, suppresses property panel and save |

**Stencils:** 10 typed stencils (call with sub-type icon switching, set, switch, raise, try, try-catch, start, end, entry, exit) plus a generic fallback for unsupported SWF types. Edge types: `flow` (solid) and `switch-case` (dashed).

**Worker thumbnail integration:** Worker nodes in `casehub-diagram` that have a `do:` block render a miniaturised SWF preview. The application registers the thumbnail renderer at init:

```typescript
import { registerThumbnailRenderer } from '@casehubio/graph-stencil-case';
import { createSwfThumbnailRenderer } from '@casehubio/graph-stencil-swf';
registerThumbnailRenderer('swf', createSwfThumbnailRenderer());
```

**Drill-down:** Worker nodes emit `diagram:worker-drill-down` pages-event with `workerId`, `workerName`, `doYaml`. The hosting app handles navigation to `swf-diagram`.

**Worker function types:** Worker stencils display a coloured badge indicating the function type (agent, flow, a2a, mcp, seq, ext). The property panel shows a function type selector and type-specific configuration forms when a worker node is selected. Supported types: Agent (prompt, model provider config), A2A (endpoint, skill, auth), MCP (stdio/HTTP transport, auth), Sequence (ordered worker list with drag-reorder), Flow (drill-down to SWF diagram). Unknown function keys render as read-only JSON. The `casehub-diagram-properties` component accepts `selectedType` and `workerNames` properties to enable the function section.

---

## Data Patterns

### DataSourceMixin (pull-based)

Lit mixin for REST endpoint data loading. Adds `endpoint`, `loading`, `error`, `dataSet` properties. Wraps `DataSourceAdapter` -> `DataSourceController` from pages-component, producing `TypedDataSet` via the extraction pipeline. Used by: similarity-panel, compliance-summary, grouped-data-view, list-pane, routing-rationale.

Additional exports: `fetchSource` (standalone fetch), `createTypedFetchSource` (typed fetch factory), `EMPTY_DATASET` (empty placeholder).

### EventStreamController (push-based)

Lit `ReactiveController` for SSE streams. Wraps `EventStream` from pages-data. Provides `latest`, `all`, and `status` (ConnectionStatus). Batches events by default. Connects/disconnects on host lifecycle.

Components can use both — DataSourceMixin for initial load, EventStreamController for live updates.

### TrendSourceMixin

Lit mixin for time-series trend data. Adds trend endpoint, provides `TrendPoint[]` via `extractTrendPoints`. Used by trust-score-panel for sparkline trends.

---

## Dependencies

- `casehub-pages` — `@casehubio/pages-data`, `@casehubio/pages-component`, `@casehubio/pages-ui-tokens`, `@casehubio/pages-primitives` (a11y mixins, pages-modal, focus trap), `@casehubio/pages-table` (data table component), `@casehubio/pages-ui-components`, `@casehubio/pages-viz`
- `@casehubio/graph-core` — graph editor core (used by graph-stencil-case and graph-stencil-swf)
- `@openworkflowspec/sdk` — SWF workflow spec SDK (used by graph-stencil-swf)

All casehub-pages dependencies are resolved via Yarn portal resolutions pointing to `.casehub-packages/`.

---

## Configuration

Components read runtime configuration from dataset endpoints:
- Polling intervals (default 30s, configurable per component)
- SSE reconnection (exponential backoff, max 60s)
- Virtual scroll viewport (default 500px ahead/behind)
- Data table page size (default 25)

No build-time configuration — all Yarn workspace with TypeScript project references.

---

## Showcase / Examples

The `examples/` directory provides a Vite-based showcase application with 38+ demo pages covering every component. Run with:

```bash
yarn examples
```

Each page provides mock data and demonstrates the component's API surface standalone.

---

## What It Does NOT Do

- **No domain-specific logic** — components are domain-aware but app-agnostic. AML investigation rules, clinical trial protocols, and governance workflows belong in application repos.
- **No direct component-to-component coupling** — all inter-component communication flows through `pages-event` CustomEvent.
- **No layout framework** — blocks-ui provides composable panels, not full page layouts. Page-level layout is the responsibility of `casehub-pages`.
- **No backend services** — components consume REST endpoints and SSE streams but do not define backend APIs or database schemas.
- **No graph rendering** — the graph stencil packages define domain adapters and stencil descriptors for the graph editor, but the graph editor itself (`@casehubio/graph-core`) lives in casehub-pages.
