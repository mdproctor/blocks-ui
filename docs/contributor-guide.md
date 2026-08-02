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

**DataSourceMixin** — Lit mixin for pull-based data loading (REST endpoints). Adds `endpoint`, `loading`, `error`, `dataSet` properties. Wraps `DataSourceAdapter` -> `DataSourceController` from pages-component. Used by: similarity-panel, compliance-summary, grouped-data-view, list-pane.

**EventStreamController** — Lit `ReactiveController` for push-based data (SSE streams). Wraps `EventStream` from pages-data. Provides `latest`, `all`, and `status` (ConnectionStatus). Batches events by default. Connects/disconnects on host lifecycle.

Components can use both — DataSourceMixin for initial load, EventStreamController for live updates.

### Frontend Dependencies

This project consumes frontend packages from casehub-pages via **Maven SNAPSHOT** artifacts (WebJar pattern) and **also publishes** its own components as Maven SNAPSHOT artifacts for downstream CaseHub apps. See [casehub-pages ADR-0001](https://github.com/casehubio/casehub-pages/blob/main/docs/adr/0001-cross-repo-frontend-dependency-management.md).

| Direction | Source | Mechanism |
|-----------|--------|-----------|
| Consumes | casehub-pages | Maven SNAPSHOT (`META-INF/resources/`) |
| Publishes | blocks-ui components | Maven SNAPSHOT (`META-INF/resources/`) |

**Local development:** after changing pages, run `yarn build && mvn install` in casehub-pages to publish the SNAPSHOT to `~/.m2`. After changing blocks-ui, run the same here so downstream apps pick up changes.

**Do not use npm `file:` references for cross-repo dependencies** — they break in CI.

---

## Full Module Details

### blocks-ui-core (`packages/blocks-ui-core`)

Tokens (re-exported from pages-ui-tokens), DataSourceMixin + DataSourceAdapter + fetchSource + createTypedFetchSource + EMPTY_DATASET (wrapping pages' DataSourceController, producing TypedDataSet via extraction pipeline), TrendSourceMixin + TrendPoint + extractTrendPoints (time-series trend data pattern), renderSparkline (shared SVG sparkline renderer), event helpers (re-exported from pages-component), domain types (TrustLevel, trustLevelFromScore, CommitmentState, CommitmentRecord, commitmentStateCategory, isTerminalCommitmentState, toCommitmentRecord, toCommitmentMap), SharedTimerController, EventStreamController, blocks-confirm-dialog (FocusTrapMixin, danger/success/neutral variants), schema-form (JSON-schema-driven), renderPropertyTree (recursive nested objects), pulseAnimation CSS, CommitmentStatePill + stateCategoryStyles.

### split-workbench (`components/split-workbench`)

Generic split-pane layout shell — draggable divider, localStorage-persisted ratio, CSS container query responsive mode (single-panel below 768px), selection coordination via pages-event topics. Accepts any children via named slots (list, detail, header).

### list-pane (`components/list-pane`)

Data list wrapping `<pages-table>` — paginated mode, single selection, client-sort/filter, emits selection events on topic. Uses DataSourceMixin for endpoint-driven data.

### detail-pane (`components/detail-pane`)

Tabbed detail view — lazily creates tab panels via `TabDefinition[]`, receives selected item via topic events, keyboard tab navigation, badges.

### grouped-data-view (`components/grouped-data-view`)

Grouped data view — items grouped by column key with per-group pages-table rendering, DataSourceMixin, group styling. Thin wrapper over pages-grouped-view.

### work-item-inbox (`components/work-item-inbox`)

Work item inbox — queue pill bar, scope context, filter bar, SSE lifecycle, three-tab perspective (My Work / Claimable / All). Uses pages-table for rendering, raw array + fromRows pattern.

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

Qhorus channel activity — message feed with sender grouping and threading, channel nav with keyboard navigation, member panel with presence, message input with speech-act type selector, emoji reactions, stale cursor detection. Extension points: formatSender, renderContent, renderContextHeader, renderError, allowedTypes/deniedTypes filtering, channel-nav layout (sidebar/dropdown), showCreate/showDelete toggles, messageCounts. DOMPurify + marked for markdown rendering.

### commitment-viz (`components/commitment-viz`)

Commitment lifecycle visualization — transition badges (`commitment-transition-badge`), range bars (compact/detailed modes), `decorateCommitmentRanges` pure function for feed decoration metadata. Props-driven, decoupled from channel-activity. Types and commitment-state-pill re-exported from blocks-ui-core.

### similarity-panel (`components/similarity-panel`)

Similar past cases — similarity scores, outcomes, resolution times via pages-table. Column renderers for similarity bar and outcome badge. Dual data mode (property or endpoint). Promoted from clinical.

### compliance-summary (`components/compliance-summary`)

Regulation compliance grid — status badges (MET/PARTIAL/GAP/BREACHED), evidence links via pages-table. Dual data mode. Promoted from clinical.

### trust-feedback-display (`components/trust-feedback-display`)

Post-gate trust score delta — decision/attestation badges, trust before/after with directional arrow, full card and compact inline modes. Complements trust-score-panel. Promoted from clinical.

### sla-breach-policy (`components/sla-breach-policy`)

SLA breach escalation tiers — active tier highlighting, optional embedded sla-indicator countdown via deadline prop, shared pulseAnimation. Promoted from clinical.

### gdpr-erasure-action (`components/gdpr-erasure-action`)

GDPR data erasure form — three-phase (input, confirmation, receipt), customisable subjectLabel and reasonOptions. Extends LitElement directly (no DataSourceMixin). Promoted from clinical.

### routing-rationale (`components/routing-rationale`)

Routing rationale — trust-weighted assignment explanation: score vs threshold with borderline margin, alternatives table with phase badges, policy summary. DataSourceMixin + LiveRegionMixin, inline-styled column renderers, renderCandidate callback, dual-data mode.

### trust-workbench (`components/trust-workbench`)

Trust workbench — composes trust-score-panel + list-pane (left) and routing-rationale + trust-feedback-display (right) in split-workbench. Capability drill-down filters routing history. Inline data mode for demos. Three consumption tiers.

### case-explorer (`components/case-explorer`)

Composable case explorer — universal entity browser with registration-based entity types. Generic components: entity-list (cursor-aware fetch, list-pane data-property mode), entity-detail (three-tier renderer resolution: sub-type, entity-type, default), entity-tree (collapsible hierarchy with lazy loading, ARIA tree, M-of-N groups), entity-command-bar (MCP-tools-style dynamic commands with confirmation), case-explorer (full split-workbench composition with NavigationController, entity type tabs, list/tree mode, breadcrumbs). Presets: caseInstanceType, workerType, caseDefinitionType, gateType, channelType. Domain customisation via columnRenderers, detailRenderer, detailRendererMap, nodeRenderer, filters.

### preferences-editor (`components/preferences-editor`)

Preferences editor — tree-table UI for scope-aware preference management. Scope hierarchy (system, tenant, team, user) with preference key-value pairs as leaves. Type-aware inline editors (string, integer, number, boolean, duration, enum) driven by PreferenceSchemaDescriptor from platform REST API. Inheritance computation (local, inherited, overridden, default) with source scope badges. PreferencesApi REST client, ValueEditor sub-component.

### session-list (`components/session-list`)

Session list — claudony session table with status badges (ACTIVE/WAITING/IDLE), inline spawn form, delete/restart actions with failure recovery. Uses raw array + fromRows pattern.

### session-detail (`components/session-detail`)

Session detail — tabbed detail pane for a selected session: Terminal (polling output), Git (branch/PR/checks), Health (port status via pages-table), Events (SSE via SSEManager). Tab lifecycle manages timers and SSE connections.

### session-workbench (`components/session-workbench`)

Session workbench — composition shell for session management. Composes session-list + session-detail in split-workbench with selection-topic="session". KeyboardShortcutMixin for overlay.

### work-item-row (`components/work-item-row`) — DEPRECATED

Single work item row component. Legacy — inbox now uses pages-table. Do not use in new code.

---

## Known Gotchas

### Shadow DOM select

The `<select>` element inside Shadow DOM can silently reset to the first option when `.value` is set before `<option>` children have rendered. The gdpr-erasure-action component demonstrates the workaround: dispatch a `change` event explicitly after setting the value programmatically.

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

---

## Current State

TypeScript/Yarn workspace monorepo with TypeScript project references. All Yarn workspace with no build-time configuration.

Build commands:

```bash
yarn install
yarn build
yarn test
yarn typecheck
```

---

## Design Documents

- [UI Architecture](https://raw.githubusercontent.com/casehubio/parent/main/docs/platform/ui-architecture.md) — pages, blocks-ui, app layering
- [Platform Index](https://raw.githubusercontent.com/casehubio/parent/main/docs/INDEX.md) — discovery index
