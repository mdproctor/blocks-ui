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

| Package | Purpose | Maturity |
|---------|---------|----------|
| `packages/blocks-ui-core` | Tokens, DataSourceMixin, TrendSourceMixin, renderSparkline, EventStreamController, event helpers, domain types, SharedTimerController, blocks-confirm-dialog, schema-form, renderPropertyTree, pulseAnimation CSS | Beta |
| `components/split-workbench` | Generic split-pane layout shell — draggable divider, localStorage-persisted ratio, responsive mode, selection coordination via pages-event topics | Beta |
| `components/list-pane` | Data list wrapping `<pages-table>` — paginated mode, single selection, client-sort/filter, emits selection events | Beta |
| `components/detail-pane` | Tabbed detail view — lazy tab panel creation, keyboard tab navigation, receives selected item via topic events | Beta |
| `components/grouped-data-view` | Grouped data view — items grouped by column key with per-group pages-table rendering | Beta |
| `components/work-item-inbox` | Work item inbox — queue pill bar, filter bar, SSE lifecycle, three-tab perspective (My Work / Claimable / All) | Beta |
| `components/work-item-detail` | Work item detail panel — action bar, activity tab, relations tab with semantic type inverses | Beta |
| `components/work-item-workbench` | Full workbench — split-pane layout with inbox and detail, keyboard shortcuts | Beta |
| `components/notification-inbox` | Notification inbox — bell with unread badge, inbox with tabs/filters/SSE, subscription list CRUD | Beta |
| `components/sla-indicator` | SLA deadline indicator — countdown, breach state, escalation badge, threshold-based colour transitions | Stable |
| `components/kpi-metric-row` | KPI metric cards — responsive grid with sparklines, trends, status colours, density property | Stable |
| `components/approval-gate` | Approval gate — structured decision point with quorum, evidence slots, SLA integration | Beta |
| `components/audit-trail-viewer` | Audit trail viewer — ledger entries with pages-table, Merkle verification banner, attestations, filters, GDPR erasure handling | Beta |
| `components/blocks-timeline` | Pluggable timeline — vertical, horizontal, compact layouts with strategy-based content | Beta |
| `components/trust-score-panel` | Agent trust score visualisation — Bayesian Beta scores, trend lines, per-capability breakdown | Beta |
| `components/channel-activity` | Qhorus channel activity — message feed, channel nav, member panel, speech-act badges | Beta |
| `components/commitment-viz` | Commitment lifecycle visualization — state pills, transition badges, range bars | Beta |
| `components/similarity-panel` | Similar past cases — similarity scores, outcomes, resolution times via pages-table | Beta |
| `components/compliance-summary` | Regulation compliance grid — status badges, evidence links via pages-table | Beta |
| `components/trust-feedback-display` | Post-gate trust score delta — decision, attestation, trust before/after with compact mode | Beta |
| `components/sla-breach-policy` | SLA breach escalation tiers — active tier highlighting, optional live countdown | Beta |
| `components/gdpr-erasure-action` | GDPR data erasure form — subject lookup, reason selection, confirmation dialog, receipt | Beta |
| `components/case-explorer` | Composable case explorer — universal entity browser with registration, state/command SPI, management actions | Beta |
| `components/preferences-editor` | Preferences editor — tree-table UI for scope-aware preference management | Beta |
| `components/routing-rationale` | Trust-weighted routing decision explanation — score vs threshold, alternatives, phases | Beta |
| `components/session-detail` | Session detail panel — session metadata, activity log, state display | Beta |
| `components/session-list` | Session list — filterable session table with status badges | Beta |
| `components/session-workbench` | Session workbench — split-pane layout with session list and detail panels | Beta |
| `components/trust-workbench` | Composite trust visibility — score panel, routing history, feedback display | Beta |
| `components/work-item-row` | Single work item row (legacy — inbox now uses pages-table) | Deprecated |

**Maturity levels:**
- **Stable** — API locked, used in production apps, full test coverage
- **Beta** — API stable, tests exist, used in staging apps or feature-flagged in prod
- **Deprecated** — being replaced, do not use in new code

---

## Key Components for App Builders

### split-workbench + list-pane + detail-pane

Generic split-pane architecture replacing the monolithic work-item-workbench pattern. Three composable components:
- `<split-workbench>` — draggable divider, responsive single-panel mode, selection coordination via topic events
- `<list-pane>` — wraps `<pages-table>` with DataSourceMixin, emits selection events
- `<detail-pane>` — lazy tab panel creation, receives items via selection events

New compositions should use split-workbench + list-pane + detail-pane (work-item-workbench still exists but is the older pattern).

### grouped-data-view

Grouped tabular data with configurable visual modes — three presets (sectioned, spreadsheet, list) via `<pages-grouped-view>`. Custom group ordering, styling callbacks, expand/collapse.

### channel-activity

Qhorus channel activity — eight sub-elements covering the full messaging lifecycle: feed (message grouping, threading, auto-scroll), individual messages, reactions, input with speech-act type selector, emoji picker, threaded replies, channel navigation, member panel with presence. DOMPurify + marked for markdown rendering.

### notification-inbox

Notification UI — bell with unread badge, inbox with tabs/filters/SSE, subscription list CRUD.

### audit-trail-viewer

Ledger entry viewer — pages-table rendering, Merkle verification banner, attestations, actor/type/date filters, GDPR erasure handling.

### blocks-timeline

Pluggable timeline — strategy-based content with three strategies: event chronology, state progression, commitment lifecycle. Three layouts (vertical, horizontal, compact), render callback resolution, temporal weighting.

### trust-score-panel

Trust score visualisation — SVG gauge, per-capability breakdown table, maturity badges, compact badge mode.

### case-explorer

Composable case explorer — universal entity browser with registration-based entity types. Presets for case instances, workers, case definitions, gates, and channels. Domain customisation via columnRenderers, detailRenderer, detailRendererMap, nodeRenderer, filters.

---

## Data Patterns

### DataSourceMixin (pull-based)

Lit mixin for REST endpoint data loading. Adds `endpoint`, `loading`, `error`, `dataSet` properties. Wraps `DataSourceAdapter` from pages-component. Used by: similarity-panel, compliance-summary, grouped-data-view, list-pane.

### EventStreamController (push-based)

Lit ReactiveController for SSE streams. Provides `latest`, `all`, and `status`. Batches events by default. Connects/disconnects on host lifecycle.

Components can use both — DataSourceMixin for initial load, EventStreamController for live updates.

---

## Dependencies

- `casehub-pages` — `@casehubio/pages-data`, `@casehubio/pages-component`, `@casehubio/pages-ui-tokens`, `@casehubio/pages-primitives` (a11y mixins, pages-modal, focus trap), `@casehubio/pages-table` (data table component)

---

## Configuration

Components read runtime configuration from dataset endpoints:
- Polling intervals (default 30s, configurable per component)
- SSE reconnection (exponential backoff, max 60s)
- Virtual scroll viewport (default 500px ahead/behind)
- Data table page size (default 25)

No build-time configuration — all Yarn workspace with TypeScript project references.

---

## What It Does NOT Do

- **No domain-specific logic** — components are domain-aware but app-agnostic. AML investigation rules, clinical trial protocols, and governance workflows belong in application repos.
- **No direct component-to-component coupling** — all inter-component communication flows through `pages-event` CustomEvent.
- **No layout framework** — blocks-ui provides composable panels, not full page layouts. Page-level layout is the responsibility of `casehub-pages`.
- **No backend services** — components consume REST endpoints and SSE streams but do not define backend APIs or database schemas.
