# casehub-blocks-ui — Contributor Guide

> Internal architecture, extension points, and development conventions for contributors modifying or extending blocks-ui components.

**GitHub:** [casehubio/blocks-ui](https://github.com/casehubio/blocks-ui)

---

## Internal Architecture

### Design Philosophy

- Components should be framework-agnostic Web Components where possible
- Each component defines its dataset contract (what data shape it consumes)
- Components communicate via `pages-event` CustomEvent — no direct component-to-component coupling
- Components should work standalone in a test harness AND embedded via pages `hostPanel`
- Visual consistency through `--pages-*` CSS custom properties from `pages-ui-tokens`
- Design for the full platform: trust scores from ledger, channel activity from qhorus, case timelines from engine, work items from work, IoT device state from iot

### Data Architecture

**DataSourceMixin** — Lit mixin for pull-based data loading (REST endpoints). Adds `endpoint`, `loading`, `error`, `dataSet` properties. Wraps `DataSourceAdapter` -> `DataSourceController` from pages-component, producing `TypedDataSet` via extraction pipeline. Used by: similarity-panel, compliance-summary, grouped-data-view, list-pane, routing-rationale.

Additional data-source exports from blocks-ui-core:
- `fetchSource(url, options)` — standalone fetch with TypedDataSet extraction
- `createTypedFetchSource(options)` — factory for typed fetch sources
- `EMPTY_DATASET` — empty TypedDataSet placeholder for initial state
- `DatasetContract` — re-exported from `@casehubio/pages-data`, the contract type for dataset shapes

**TrendSourceMixin** — Lit mixin for time-series trend data. Adds trend endpoint, provides `TrendPoint[]` via `extractTrendPoints`. Used by trust-score-panel for sparkline trend lines.

**EventStreamController** — Lit `ReactiveController` for push-based data (SSE streams). Wraps `EventStream` from pages-data. Provides `latest`, `all`, and `status` (ConnectionStatus). Batches events by default. Connects/disconnects on host lifecycle.

Components can use both — DataSourceMixin for initial load, EventStreamController for live updates.

### Frontend Dependencies

This project consumes frontend packages from casehub-pages via Yarn **portal** resolutions (pointing to `.casehub-packages/`) and **also publishes** its own components as Maven SNAPSHOT artifacts for downstream CaseHub apps. See [casehub-pages ADR-0001](https://github.com/casehubio/casehub-pages/blob/main/docs/adr/0001-cross-repo-frontend-dependency-management.md).

| Direction | Source | Mechanism |
|-----------|--------|-----------|
| Consumes | casehub-pages | Yarn portal (`.casehub-packages/`) for dev; Maven SNAPSHOT (`META-INF/resources/`) for CI/apps |
| Consumes | graph-core | Yarn portal (`.casehub-packages/packages/graph-core`) |
| Publishes | blocks-ui components | Maven SNAPSHOT (`META-INF/resources/`) |

Portal resolutions are declared in the root `package.json`:
- `@casehubio/pages-component`, `@casehubio/pages-data`, `@casehubio/pages-primitives`, `@casehubio/pages-table`, `@casehubio/pages-ui-components`, `@casehubio/pages-ui-tokens`, `@casehubio/pages-viz`, `@casehubio/graph-core`

**Local development:** after changing pages, run `yarn build && mvn install` in casehub-pages to publish the SNAPSHOT to `~/.m2`. After changing blocks-ui, run the same here so downstream apps pick up changes.

**Do not use npm `file:` references for cross-repo dependencies** — they break in CI.

---

## Full Module Details

### blocks-ui-core (`packages/blocks-ui-core`)

Core shared utilities re-exported from pages and domain-specific to blocks-ui:

**Tokens** (re-exported from pages-ui-tokens): `generateScale`, `SPACING_SCALE`, `TYPOGRAPHY`, `MOTION`, `RADIUS`, `ELEVATION_LIGHT`, `ELEVATION_DARK`, `DENSITY_COMPACT_OVERRIDES`, `applyTheme`, `registerTheme`, `getTheme`, `listThemes`.

**Data source** (wrapping pages DataSourceController): `DataSourceMixin`, `DataSourceAdapter`, `fetchSource` + `FetchSourceOptions`, `createTypedFetchSource` + `TypedFetchOptions`, `EMPTY_DATASET`, `TrendSourceMixin`, `TrendPoint`, `extractTrendPoints`.

**Event stream**: `EventStreamController` (Lit ReactiveController for SSE).

**Rendering**: `renderSparkline` + `SparklineOptions` (shared SVG sparkline), `renderPropertyTree` + `propertyTreeStyles` (recursive nested object renderer).

**Domain types**: `TrustLevel`, `trustLevelFromScore(score)`, `CommitmentState` (7-state: OPEN/ACKNOWLEDGED/FULFILLED/FAILED/DECLINED/DELEGATED/EXPIRED), `CommitmentRecord`, `RawCommitment`, `commitmentStateCategory(state)`, `isTerminalCommitmentState(state)`, `toCommitmentRecord(raw)`, `toCommitmentMap(commitments)`, `StateCategory`.

**UI components**: `BlocksConfirmDialog` (`<blocks-confirm-dialog>`, FocusTrapMixin, danger/success/neutral variants), `CommitmentStatePill` (`<commitment-state-pill>`, promoted from commitment-viz in #101), `stateCategoryStyles` + `CategoryStyle`.

**Utilities**: `SharedTimerController` (`subscribe`/`unsubscribe`), `pulseAnimation` CSS, `DatasetContract` (re-exported from pages-data).

**Event helpers**: re-exported from pages-component (`emitPagesEvent`, `onPagesEvent`).

### graph-stencil-case (`packages/graph-stencil-case`)

Case domain adapter for the visual diagram editor (epic #103). Exports:
- `CaseAdapter` — implements `DomainAdapter<string>` from `@casehubio/graph-core`. `toGraph(yamlSource)` parses case definition YAML into `GraphModel`. `applyEdit(yamlSource, edit)` applies structural edits back to YAML. Currently stubbed.
- `caseStencils` — array of `StencilDescriptor` objects defining the case domain grammar:
  - **binding** — can be contained by worker, outbound to worker
  - **worker** — container for bindings, connects to/from bindings
  - **milestone** — connects from bindings/goals, outbound to bindings
  - **goal** — terminal node (success/failure kind), inbound only
  - **subcase** — sub-case reference (namespace/name/version), inbound only
- `CaseDefinition` type

Each stencil defines grammar rules (containment, connection min/max/allowedFrom/allowedTo) and JSON Schema property definitions.

### graph-stencil-swf (`packages/graph-stencil-swf`)

Serverless Workflow (SWF) domain adapter for the visual diagram editor (epic #103). Exports:
- `SwfAdapter` — implements `DomainAdapter<string>`. Uses `@openworkflowspec/sdk` for SWF YAML parsing. Currently stubbed.
- `swfStencils` — array of `StencilDescriptor` objects:
  - **swf-call** — function call node, outbound to call/switch/raise/exit
  - **swf-switch** — conditional branch, multiple outbound connections
  - (TODO: raise, catch, entry, exit stencils)

### split-workbench (`components/split-workbench`)

Generic split-pane layout shell — draggable divider, localStorage-persisted ratio, CSS container query responsive mode (single-panel below 768px), selection coordination via pages-event topics. Accepts any children via named slots (list, detail, header).

### list-pane (`components/list-pane`)

Data list wrapping `<pages-table>` — paginated mode, single selection, client-sort/filter, emits selection events on topic. Uses DataSourceMixin for endpoint-driven data. Also supports inline data via the `data` property (data-property mode, used by case-explorer's entity-list).

### detail-pane (`components/detail-pane`)

Tabbed detail view — lazily creates tab panels via `TabDefinition[]`, receives selected item via topic events, keyboard tab navigation, badges.

### grouped-data-view (`components/grouped-data-view`)

Grouped data view — items grouped by column key with per-group pages-table rendering, DataSourceMixin, group styling. Thin wrapper over `<pages-grouped-view>`.

### work-item-inbox (`components/work-item-inbox`)

Work item inbox — queue pill bar, scope context bar, filter bar with counts, summary bar, three-tab perspective (My Work / Claimable / All), queue scope integration, SSE lifecycle. Uses pages-table for rendering with the raw array + `fromRows` pattern.

### work-item-detail (`components/work-item-detail`)

Work item detail panel — action bar, activity tab, relations tab (outgoing + incoming with semantic type inverses).

### work-item-workbench (`components/work-item-workbench`)

Full workbench — split-pane layout with inbox (left) and detail (right), keyboard shortcuts and overlay. Uses split-workbench internally.

### notification-inbox (`components/notification-inbox`)

Notification inbox — bell with unread badge, inbox with tabs/filters/SSE, subscription list CRUD, subscription editor (schema-driven form with dynamic event-type field rebuild), channel preferences (per-channel delivery mode/digest/groupBy/quiet hours), mute list (table + inline add form with scope-conditional fields), snooze control (toggle with date-time picker), notification preferences container (composes channel/mute/snooze).

### sla-indicator (`components/sla-indicator`)

SLA deadline indicator — countdown, breach state, escalation badge, threshold-based colour transitions.

### kpi-metric-row (`components/kpi-metric-row`)

KPI metric cards — responsive grid with sparklines, trends, status colours, density property (comfortable/compact/dense), reactive endpoint.

### approval-gate (`components/approval-gate`)

Approval gate — structured decision point with quorum, evidence slots, SLA integration, confirmation dialog.

### audit-trail-viewer (`components/audit-trail-viewer`)

Audit trail viewer — ledger entries with data-table, Merkle verification banner, attestations, actor/type/date filters, GDPR erasure handling.

### blocks-timeline (`components/blocks-timeline`)

Pluggable timeline — strategy-based content (event chronology, state progression, commitment lifecycle), three layouts (vertical, horizontal, compact), render callback resolution (component > strategy > default), temporal weighting, staggered axis labels, strategy-declared pagination (load-more in vertical layout, bypasses DataSourceMixin for raw JSON access). Replaces case-timeline.

### trust-score-panel (`components/trust-score-panel`)

Trust score panel — SVG gauge, per-capability breakdown table, trend sparkline (via TrendSourceMixin, supports simulated/inline/direct data), maturity badges, compact badge mode.

### channel-activity (`components/channel-activity`)

Qhorus channel activity — message feed with sender grouping and threading, channel nav with keyboard navigation, member panel with presence, message input with speech-act type selector, emoji reactions, stale cursor detection. Promoted from connectors chat-demo. Extension points: `formatSender`, `renderContent`, `renderContextHeader`, `renderError`, `allowedTypes`/`deniedTypes` filtering (per protocol PP-20260713-8ea1af), channel-nav layout (sidebar/dropdown), `showCreate`/`showDelete` toggles, `messageCounts`. DOMPurify + marked for markdown rendering.

### commitment-viz (`components/commitment-viz`)

Commitment lifecycle visualization — transition badges (`commitment-transition-badge`), range bars (compact/detailed modes), `decorateCommitmentRanges` pure function for feed decoration metadata. Props-driven, decoupled from channel-activity. Types and commitment-state-pill re-exported from blocks-ui-core (pill promoted in #101).

### similarity-panel (`components/similarity-panel`)

Similar past cases — similarity scores, outcomes, resolution times via pages-table. Column renderers for similarity bar and outcome badge. Dual data mode (property or endpoint). Promoted from clinical.

### compliance-summary (`components/compliance-summary`)

Regulation compliance grid — status badges (MET/PARTIAL/GAP/BREACHED), evidence links via pages-table. Dual data mode. Promoted from clinical.

### trust-feedback-display (`components/trust-feedback-display`)

Post-gate trust score delta — decision/attestation badges, trust before/after with directional arrow, full card and compact inline modes. Complements trust-score-panel. Promoted from clinical.

### sla-breach-policy (`components/sla-breach-policy`)

SLA breach escalation tiers — active tier highlighting, optional embedded sla-indicator countdown via deadline prop, shared pulseAnimation. Promoted from clinical.

### gdpr-erasure-action (`components/gdpr-erasure-action`)

GDPR data erasure form — three-phase (input, confirmation, receipt), customisable `subjectLabel` and `reasonOptions`. Extends LitElement directly (no DataSourceMixin). Promoted from clinical.

### routing-rationale (`components/routing-rationale`)

Routing rationale — trust-weighted assignment explanation: score vs threshold with borderline margin, alternatives table with phase badges, policy summary. DataSourceMixin + LiveRegionMixin, inline-styled column renderers, `renderCandidate` callback, dual-data mode.

### trust-workbench (`components/trust-workbench`)

Trust workbench — composes trust-score-panel + list-pane (left) and routing-rationale + trust-feedback-display (right) in split-workbench. Capability drill-down filters routing history. Inline data mode for demos. Three consumption tiers.

### case-explorer (`components/case-explorer`)

Composable case explorer — universal entity browser with registration-based entity types. Generic components: entity-list (cursor-aware fetch, list-pane data-property mode), entity-detail (three-tier renderer resolution: sub-type, entity-type, default), entity-tree (collapsible hierarchy with lazy loading, ARIA tree, M-of-N groups), entity-command-bar (MCP-tools-style dynamic commands with confirmation), case-explorer (full split-workbench composition with NavigationController, entity type tabs, list/tree mode, breadcrumbs). Presets: caseInstanceType, workerType, caseDefinitionType, gateType, channelType. Convenience wrappers: case-instance-list, worker-list, case-definition-browser, case-detail-panel, worker-detail-panel. Domain customisation via `columnRenderers`, `detailRenderer`, `detailRendererMap`, `nodeRenderer`, `filters`.

### preferences-editor (`components/preferences-editor`)

Preferences editor — tree-table UI for scope-aware preference management. Scope hierarchy (system, tenant, team, user) with preference key-value pairs as leaves. Type-aware inline editors (string, integer, number, boolean, duration, enum) driven by `PreferenceSchemaDescriptor` from platform REST API. Inheritance computation (local, inherited, overridden, default) with source scope badges. `PreferencesApi` REST client, `ValueEditor` sub-component.

### session-list (`components/session-list`)

Session list — claudony session table with status badges (ACTIVE/WAITING/IDLE), inline spawn form, delete/restart actions with failure recovery. Uses raw array + `fromRows` pattern (like work-item-inbox), `emitPagesEvent` for selection/change events. Types: `SessionResponse`, `SessionStatus`, `CreateSessionRequest`, `GitStatusResponse`, `PortStatus`.

### session-detail (`components/session-detail`)

Session detail — tabbed detail pane for a selected session: Terminal (polling output), Git (branch/PR/checks), Health (port status via pages-table), Events (SSE via SSEManager). Tab lifecycle manages timers and SSE connections. Listens for `session:selected`/`session:deselected` events.

### session-workbench (`components/session-workbench`)

Session workbench — composition shell for session management. Composes session-list + session-detail in split-workbench with `selection-topic="session"`. `KeyboardShortcutMixin` for overlay. `configure()` method for hostPanel integration.

### document-workbench (`components/document-workbench`)

Document review workbench panels for AI-assisted document review. Nine LitElement components:

**DebateFeed** (`<debate-feed>`) — streaming debate entry viewer with round dividers, auto-scroll. Receives entries via `debate-entries` pages-event. Agent roles: REV, IMP, HUMAN, SUPERVISOR, MODERATOR, SELECTOR. Entry types: RAISE, AGREE, COUNTER, DISPUTE, QUALIFY, FLAG_HUMAN, DECLINED, MEMO, SUB_TASK_REQUEST/FINDING/ERROR, RESTART_CONTEXT, COMMENT, HUMAN_OVERRIDE, REPRIORITISE, VERIFIED, DEFERRED. Entries with `pointId` emit `point-selected` on click. CSS colour-codes entries by type (border-left colours, opacity for declined, warning banner for FLAG_HUMAN, indented for sub-tasks).

**DocumentDiff** (`<document-diff>`) — side-by-side markdown diff viewer. Split and unified view modes. Line-level LCS diff with adjacent del+ins coalesced into mod chunks. Word-level diff highlighting within modified chunks. Scroll sync via heading-matched anchor interpolation. Minimap canvas in the divider gutter (red=deleted, green=inserted). Diff navigation (nextDiff/prevDiff with wrap-around). Drag-and-drop file loading. `loadFile(panel, path)` fetches via REST, `loadContent(panel, content, label)` for inline data. `scrollToLocation(location)` with heading fuzzy-match (numeric sections, substring, word overlap). `highlightSection(location)` adds vertical accent bar. `selection-changed` event for text selection. Listens to `timeline-comparison-changed` for snapshot pair loading. Uses marked for markdown rendering.

**DocumentTimeline** (`<document-timeline>`) — horizontal snapshot timeline. Receives `ROUND_SNAPSHOT` entries from debate-entries. Click selects comparison range; shift-click for second endpoint. Emits `timeline-comparison-changed`. Trail highlight integration: `point-selected`/`point-deselected` events set raise/fix/verify round markers on the timeline.

**ReviewTracker** (`<review-tracker>`) — review point tracker derived from debate entries. Derives point status from entry types (RAISE->OPEN, AGREE->AGREED, COUNTER->ACTIVE, DISPUTE->DISPUTED, QUALIFY->ACTIVE, FLAG_HUMAN->PENDING_HUMAN, DECLINED->DECLINED, VERIFIED->VERIFIED, DEFERRED->DEFERRED, HUMAN_OVERRIDE->HUMAN_OVERRIDE). Progress bar (resolved/total). Filter toggle (hide resolved). Per-point actions: comment (POST to `human/comment`), override (POST to `human/override`), priority change (POST to `human/prioritise`). Batch accept/defer for low-priority points (POST to `human/batch`). Agent trail display. Point selection emits `point-selected`/`point-deselected`.

**ContextGauge** (`<context-gauge>`) — LLM context window usage. Receives `context-usage` pages-event with `effectivePercent`, `windowSizeChars`, `serverContributionChars`, `messageCount`, `agentReportedPercent`. Gauge bar with threshold colours (normal < 60%, warn < 80%, error >= 80%). Pulse animation on `thresholdExceeded`. Tooltip with detailed stats.

**DocPicker** (`<doc-picker>`) — document slot picker dropdown. Shows available documents from `documents-changed` events. A/B slot buttons for comparison selection. Posts comparison changes to `api/debate/{sessionId}/comparison`. Visible only when documents exist.

**BrainstormOptions** (`<brainstorm-options>`) — brainstorm option cards. Receives `brainstorm-options`, `brainstorm-converged`, `brainstorm-ended` events. Status badges (LIVE/RECOMMENDED/EXPLORED/ELIMINATED/SELECTED). Actions: recommend, eliminate, select (PATCH to `api/brainstorm/{sessionId}/options/{optionId}`). Converged/ended banners.

**BrainstormPicker** (`<brainstorm-picker>`) — brainstorm session switcher. Lists sessions from `brainstorm-sessions` events. Emits `brainstorm-session-selected`.

**WorkspaceStatus** (`<workspace-status>`) — agent workspace progress. Receives `workspace-progress` events. Progress types: AGENT_START, AGENT_STATUS, AGENT_COMPLETE, ISSUES_RAISED, ROUND_COMPLETE, REVIEW_TERMINAL. Elapsed timer, cost display, pulsing/terminal status dot.

All panels follow the `configure(props)` pattern for hostPanel integration and use `onPagesEvent` for data flow. All listen for `reconnected` to reset state on SSE reconnect.

### work-item-row (`components/work-item-row`) — DEPRECATED

Single work item row component. Legacy — inbox now uses pages-table. Do not use in new code.

---

## Known Gotchas

### Shadow DOM select

The `<select>` element inside Shadow DOM can silently reset to the first option when `.value` is set before `<option>` children have rendered. The gdpr-erasure-action component demonstrates the workaround: dispatch a `change` event explicitly after setting the value programmatically.

### Portal resolution ordering

Yarn portal resolutions in root `package.json` must match the actual directory structure in `.casehub-packages/`. If a new pages package is added upstream, add a corresponding portal resolution here or the build will fail with unresolved peer dependencies.

### blocks- prefix convention

All custom element tag names use the `blocks-` prefix (adopted in #94). When adding new components, register with `@customElement('blocks-<name>')`. The document-workbench panels are an exception — they use unprefixed names (`<debate-feed>`, `<document-diff>`, etc.) because they predate the convention.

---

## Depended On By

Application repos embed components via `hostPanel` + `registerPanel` in their pages dashboards. Each application's dashboard composes blocks-ui components into domain-specific layouts.

Key consumers by component:
- **split-workbench + list-pane + detail-pane:** openclaw, devtown, aml, clinical, drafthouse, life, soc, ops
- **grouped-data-view:** clinical, aml
- **channel-activity:** drafthouse, claudony, devtown, clinical
- **notification-inbox:** all applications (platform-level feature)
- **audit-trail-viewer:** aml, clinical, devtown, life, soc
- **blocks-timeline:** aml, clinical, life, ops, drafthouse, devtown
- **trust-score-panel:** aml, devtown, clinical, life, ops
- **document-workbench:** drafthouse (document review workflow)

---

## Current State

TypeScript/Yarn workspace monorepo with TypeScript project references. Yarn 4.10.3. All Yarn workspace with no build-time configuration.

Build commands:

```bash
yarn install
yarn build            # topological build across all workspaces
yarn test             # run tests across all workspaces
yarn typecheck        # tsc --build
yarn examples         # start Vite showcase server
```

Test framework: Vitest with jsdom environment.

---

## Design Documents

- [UI Architecture](https://raw.githubusercontent.com/casehubio/parent/main/docs/platform/ui-architecture.md) — pages, blocks-ui, app layering
- [Platform Index](https://raw.githubusercontent.com/casehubio/parent/main/docs/INDEX.md) — discovery index
- `docs/specs/` — design specs for individual features (23+ specs since July 2026)
- `docs/plans/` — implementation plans
- `docs/blog/` — technical diary entries
