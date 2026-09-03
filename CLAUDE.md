# CLAUDE.md

**Name:** casehub-blocks-ui



## Project Type

type: custom

## Work Tracking

Issue tracking: enabled
GitHub repo: casehubio/blocks-ui
Changelog: GitHub Releases

## What This Project Is

Shared UI components for CaseHub applications — the UI parallel to [casehub-blocks](https://github.com/casehubio/blocks) (shared Java coordination patterns). Each component consumes `casehub-pages` APIs (`registerPanel`, `pages-event`, dataset contracts) but knows nothing about a specific app's domain model.

TypeScript/Yarn workspace monorepo with TypeScript project references.

## Platform Docs
- [Platform Index](https://raw.githubusercontent.com/casehubio/parent/main/docs/INDEX.md) — discovery index (start here)
- [Building Platform](https://raw.githubusercontent.com/casehubio/parent/main/docs/guides/building-platform.md) — platform contributor guide

## Repo Guide

This repo owns its own documentation, synced to parent via CI:
- `docs/guides/consumer-guide.md` — for app builders: modules, APIs, quick start
- `docs/guides/contributor-guide.md` — for platform builders: architecture, SPIs, internals

Update the relevant guide in the same session when implementation changes modules, SPIs, or public APIs. Do not defer — drift compounds.

Read `docs/guides/consumer-guide.md` for app-level work. Only read `docs/guides/contributor-guide.md` when modifying this repo's internals or extension points.

## Repository Role

Reusable, domain-aware UI components that multiple CaseHub applications share. Consumes casehub-pages APIs. Framework-agnostic Web Components where possible.

**Peer repos (each has its own Claude session — do not commit to these):**
platform, eidos, ledger, connectors, iot, work, worker, qhorus, pages, engine, claudony, openclaw, neural-text, devtown, aml, clinical, drafthouse, life, quarkmind, flow, soc, fsitrading, ras, ops, workers, desiredstate, blocks

## Frontend Dependencies

This project consumes frontend packages from casehub-pages via **Maven SNAPSHOT** artifacts (WebJar pattern) and **also publishes** its own components as Maven SNAPSHOT artifacts for downstream CaseHub apps.
See [casehub-pages ADR-0001](https://github.com/casehubio/casehub-pages/blob/main/docs/adr/0001-cross-repo-frontend-dependency-management.md).

| Direction | Source | Mechanism |
|-----------|--------|-----------|
| Consumes | casehub-pages | Maven SNAPSHOT (`META-INF/resources/`) |
| Publishes | blocks-ui components | Maven SNAPSHOT (`META-INF/resources/`) |

**Local development:** after changing pages, run `yarn build && mvn install` in casehub-pages to publish the SNAPSHOT to `~/.m2`. After changing blocks-ui, run the same here so downstream apps pick up changes.

**Do not use npm `file:` references for cross-repo dependencies** — they break in CI. See ADR-0001.

## Build Commands

```bash
yarn install
yarn build
yarn test
yarn typecheck
```

## Key Directories

| Path | Contents |
|------|----------|
| `packages/blocks-ui-core/` | Domain types (TrustLevel, trustLevelFromScore, CommitmentState, CommitmentRecord, commitmentStateCategory, isTerminalCommitmentState, toCommitmentRecord, toCommitmentMap), CommitmentStatePill + stateCategoryStyles (commitment-state-pill web component + category styling — promoted from commitment-viz), StatusBadge + status registry (generic status pill for all domains — lookupStatus/registerStatus with 15 built-in domains including execution/agent/pattern/conversation/epistemic, toDecoration for graph overlays), orchestration types (ExecutionState, ExecutionResult, AgentRef, AgentResult, PatternType, ExecutionModel, FailurePolicy, OrchestrationAuditEvent, ExecutionSnapshot), conversation protocol types (EpistemicStatus, ConvergenceState, ConvergenceSignal, CommonGroundState, GroundedFact, ConversationPoint, ConversationEntry, SubTaskFinding, FlagEntry, RoundMemo, ObligationChain, ConversationState), TransitionRecord (promoted from commitment-viz). Pages primitives (DataSourceMixin, emitPagesEvent, fetchSource, etc.) are imported directly from their canonical pages packages — not re-exported through blocks-ui-core. |
| `components/work-item-inbox/` | Work item inbox — uses pages-table for rendering, queue pill bar, scope context bar, filter bar with counts, summary bar, three-tab perspective (My Work / Claimable / All), queue scope integration, SSE lifecycle |
| `components/work-item-row/` | Single work item row — priority badge, status indicator, overdue/breach markers (legacy — inbox now uses data-table) |
| `components/work-item-detail/` | Work item detail panel — action bar, activity tab, relations tab (outgoing + incoming with semantic type inverses) |
| `components/split-workbench/` | Generic split-pane layout shell — draggable divider, responsive collapse, selection-topic event coordination, ARIA regions. Accepts any children via named slots (list, detail, header). |
| `components/list-pane/` | Generic list wrapping pages-table — DataSourceMixin data fetching, single-selection, paginated mode, client-sort/filter, selection-topic events, refresh event |
| `components/detail-pane/` | Generic tabbed detail container — tabs via property array (TabDefinition[]), item property contract, lazy element creation, ARIA tablist, keyboard navigation, badges |
| `components/work-item-workbench/` | Work item workbench — uses split-workbench internally, slots inbox (left) and detail (right), keyboard shortcuts and overlay |
| `components/notification-inbox/` | Notification inbox — bell with unread badge, inbox with tabs/filters/SSE, subscription list CRUD, subscription editor (schema-driven form with dynamic event-type field rebuild), channel preferences (per-channel delivery mode/digest/groupBy/quiet hours), mute list (table + inline add form with scope-conditional fields), snooze control (toggle with date-time picker), notification preferences container (composes channel/mute/snooze) |
| `components/sla-indicator/` | SLA deadline indicator — countdown, breach state, escalation badge, threshold-based colour transitions |
| `components/kpi-metric-row/` | KPI metric cards — responsive grid with sparklines, trends, status colours, density property (comfortable/compact/dense), reactive endpoint |
| `components/approval-gate/` | Approval gate — structured decision point with quorum, evidence slots, SLA integration, confirmation dialog |
| `components/audit-trail-viewer/` | Audit trail viewer — composes blocks-event-trail with ledger-specific column defs, Merkle verification banner (own DataSourceAdapter), attestation detail rendering, GDPR erasure handling. Receives raw entries via `data-loaded` event for attestation lookup. |
| `components/event-trail/` | Event trail — composes pages-filter-bar + pages-table with DataSourceMixin lifecycle. Client-side chip/entity filtering, server-side date range params. Dual data mode (endpoint or inline). `data-loaded` event for raw entry access. Detail expansion via getRowDetail callback. |
| `components/blocks-timeline/` | CaseHub timeline — extends PagesEventTimeline with tenancy header mapping via configure(). Domain strategies: event chronology, state progression, commitment lifecycle, orchestration events. All generic timeline capabilities (self-fetch, pagination, layouts, rendering) are in pages-viz PagesEventTimeline. |
| `components/trust-score-panel/` | Trust score panel — SVG gauge, per-capability breakdown table, trend sparkline (via TrendSourceMixin, supports simulated/inline/direct data), maturity badges, compact badge mode |
| `components/similarity-panel/` | Similar past cases — similarity scores, outcomes, resolution times via pages-table. Column renderers for similarity bar and outcome badge. Dual data mode (property or endpoint). Promoted from clinical. |
| `components/compliance-summary/` | Regulation compliance grid — status badges (MET/PARTIAL/GAP/BREACHED), evidence links via pages-table. Dual data mode. Promoted from clinical. |
| `components/grouped-data-view/` | Grouped data view — items grouped by column key with per-group pages-table rendering, DataSourceMixin, group styling. Thin wrapper over pages-grouped-view. |
| `components/routing-rationale/` | Routing rationale — trust-weighted assignment explanation: score vs threshold with borderline margin, alternatives table with phase badges, policy summary. DataSourceMixin + LiveRegionMixin, inline-styled column renderers, renderCandidate callback, dual-data mode. |
| `components/trust-feedback-display/` | Post-gate trust score delta — decision/attestation badges, trust before/after with directional arrow, full card and compact inline modes. Complements trust-score-panel. Promoted from clinical. |
| `components/trust-workbench/` | Trust workbench — composes trust-score-panel + list-pane (left) and routing-rationale + trust-feedback-display (right) in split-workbench. Capability drill-down filters routing history. Inline data mode for demos. Three consumption tiers. |
| `components/sla-breach-policy/` | SLA breach escalation tiers — active tier highlighting, optional embedded sla-indicator countdown via deadline prop, shared pulseAnimation. Complements sla-indicator. Promoted from clinical. |
| `components/gdpr-erasure-action/` | GDPR data erasure form — three-phase (input / confirmation / receipt), customisable subjectLabel and reasonOptions. Extends LitElement directly (no DataSourceMixin). Promoted from clinical. |
| `components/commitment-viz/` | Commitment lifecycle visualization — transition badges, range bars (compact/detailed modes), decorateCommitmentRanges pure function for feed decoration metadata. Props-driven, decoupled from channel-activity. Types and commitment-state-pill re-exported from blocks-ui-core. |
| `components/channel-activity/` | Qhorus channel activity — message feed with sender grouping and threading, channel nav with keyboard navigation, member panel with presence, message input with speech-act type selector, emoji reactions, stale cursor detection. Convenience wrapper composes nav + feed + input + topic-bar in split-workbench with tabbed sidebar. Three tiers: standalone, panel-hosted, inline data. |
| `components/case-flow-viewer/` | Case flow viewer — read-only case definition DAG with runtime decorations (trust score pills, adaptive decision badges, parallel groups). Extends DiagramBaseMixin in readonly mode. Toolbar with stats, staleness, case status badge, SVG/PNG export. |
| `components/case-explorer/` | Composable case explorer — universal entity browser with registration-based entity types. Generic components: entity-list, entity-detail, entity-tree, entity-command-bar, case-explorer. Presets: caseInstanceType, workerType, caseDefinitionType, gateType, channelType. |
| `components/worker-task-pane/` | Worker task pane — generic specialist task queue with context tabs (TabDefinition[]), workspace element registry (WorkspaceDefinition[]), response/claim/decline form. Extends LiveRegionMixin. Direct fetch (no DataSourceMixin) like work-item-inbox. Optional SSE via eventStreamEndpoint + SSEManager. |
| `components/preferences-editor/` | Preferences editor — tree-table UI for scope-aware preference management. Scope hierarchy (system/tenant/team/user) with type-aware inline editors driven by PreferenceSchemaDescriptor from platform REST API. |
| `components/session-list/` | Session list — claudony session table with status badges, inline spawn form, delete/restart actions with failure recovery. |
| `components/session-detail/` | Session detail — tabbed detail pane: Terminal, Git, Health, Events tabs. Tab lifecycle manages timers and SSE connections. |
| `components/execution-monitor/` | Execution monitor — SSE-driven live execution state for orchestration framework. State badge, pattern badge, execution model summary, agent roster. Dual data mode. Staleness detection. |
| `components/orchestration-workbench/` | Orchestration workbench — composes execution-monitor + blocks-timeline with orchestration-events strategy in split-workbench. Three consumption tiers. |
| `packages/diagram-core/` | Shared diagram orchestration — DiagramBaseMixin (undo/redo, render pipeline, dirty tracking, persistence, keyboard shortcuts, src fetch, error/degraded/readonly modes, SVG/PNG export), DiagramToolbar, DiagramProperties, schema registry, form utilities |
| `packages/graph-stencil-case/` | Case domain adapter (YAML / graph), structural stencils, ThumbnailRenderer SPI, runtime module, GitHubBackend persistence, YAML editor, worker-function module |
| `packages/graph-stencil-swf/` | SWF domain adapter, SWF stencils, edge types, applySwfPropertyEdit (CST-preserving), swfTaskSchema, createSwfThumbnailRenderer |
| `packages/graph-stencil-htn/` | HTN/DAG domain adapter — TypeScript types mirroring engine sealed interfaces, DAG adapter, dag-node stencil, runtime module |
| `components/casehub-diagram/` | CaseHub visual diagram — editor component for CaseDefinition YAML. Extends DiagramBaseMixin. Case-specific stencil registration, palette, runtime overlay, structural editing with dependency checks. |
| `components/diagram-workbench/` | Diagram workbench — split-pane composition of casehub-diagram + swf-diagram. Click worker node to drill down to SWF workflow. Three consumption tiers. |
| `components/blocks-dag-viewer/` | DAG execution graph viewer — read-only graph wrapping pages-graph-canvas with ELK layout. Toolbar with dispatch mode badge, summary stats, staleness timer. |
| `components/blocks-decomposition-tree/` | HTN decomposition tree — recursive ARIA tree for CompoundTask / DecompositionMethod / children hierarchy. Strategy badges, guard labels, nodeStates-driven status badges. |
| `components/blocks-plan-item-tree/` | PlanItemDefinition tree — recursive ARIA tree for Primitive/Compound plan item hierarchy. CompletionSemantics badges, DispatchMode pills, repeatable indicators. |
| `components/blocks-plan-model-dashboard/` | CasePlanModel dashboard — card-based grid layout: agenda table, focus area, resource budget, sub-case list, compound definition progress bars. |
| `components/session-workbench/` | Session workbench — composition shell for session management. Composes session-list + session-detail in split-workbench. |
| `components/conversation-viewer/` | Conversation protocol viewer — convergence indicator, common ground panel, point list, point detail, conversation workbench. Property-based data delivery. |
| `components/swf-diagram/` | SWF workflow diagram — standalone canvas for Serverless Workflow YAML. Extends DiagramBaseMixin. No structural editing (read-only + property editing). |
| `components/service-card/` | Per-service health card — status badge, replicas, image, per-cluster deployment status. Dual data mode. |
| `components/cluster-panel/` | Cluster management panel — cluster list, registration form, connectivity test, delete. Dual data mode. Readonly mode. |
| `components/reconciliation-status/` | Desired vs actual reconciliation — per-cluster sections with per-node status grid. SSE live updates. |
| `components/dimension-dashboard/` | Multi-dimension status dashboard — N dimensions with severity badges, active response counts, compact layout. Dual data mode. |
| `components/topology-viewer/` | Service dependency DAG — topology graph with status-coloured nodes, replica badges, edge labels. SSE live updates. |

## Design Philosophy

- Components should be framework-agnostic Web Components where possible
- Each component defines its dataset contract (what data shape it consumes)
- Components communicate via `pages-event` CustomEvent — no direct component-to-component coupling
- Components should work standalone in a test harness AND embedded via pages `hostPanel`
- Visual consistency through `--pages-*` CSS custom properties from `pages-ui-tokens`
- Design for the full platform: trust scores from ledger, channel activity from qhorus, case timelines from engine, IoT device state from iot

## ARIA Requirements

Every component must have ARIA attributes. ARIA is the unified interaction model — no component ships without it.

**Mandatory for every `@customElement`:**
- `aria-label` on the host or primary container (set in `connectedCallback` or as a reflected property)
- Appropriate `role` attribute matching the component's interaction pattern
- State attributes (`aria-busy`, `aria-disabled`, `aria-expanded`, etc.) reflecting component state

**Pattern guide** (pick the pattern matching the component's function):
- **Interactive controls:** `role="button"`, `role="form"`, `role="listbox"` + state attrs
- **Data display:** `role="region"` + `aria-label`, or `role="status"` + `aria-live="polite"`
- **Trees:** `role="tree"` / `role="treeitem"` + `aria-expanded`, `aria-level`
- **Tabs:** `role="tablist"` / `role="tab"` / `role="tabpanel"` + `aria-selected`, `aria-controls`
- **Visualizations:** `role="img"` + `aria-label` describing the content
- **Live content:** `role="log"` or `role="status"` + `aria-live="polite"`
- **Composition shells:** Inherit ARIA from composed children (split-workbench provides regions)

**Tests:** Every component test file must include ARIA assertions verifying role and aria-label.

**Build validation:** `yarn aria-check` scans all components for minimum ARIA compliance. CI fails if any component lacks ARIA.

## IntelliJ MCP Routing

One IntelliJ MCP server is available:

- **`mcp__intellij-index__*`** — use this for ALL code intelligence and navigation. Supports auto-opening projects via `project_path` — pass the project path and the plugin opens it automatically. Never ask the user to open a project manually.

`mcp__intellij__*` (built-in JetBrains MCP) is **disabled** due to a memory leak. Do not attempt to use it. All operations (find class, find references, type hierarchy, diagnostics, rename, move) go through `mcp__intellij-index__*`.

**If a project is not open:** pass `project_path` to any `mcp__intellij-index__` tool — it opens automatically. Do not fall back to bash. Do not launch IntelliJ from the command line.

## Development Workflow

Before designing: `superpowers:brainstorming`
Before implementing: `superpowers:test-driven-development`
For all TypeScript work: `ts-dev`
Before committing: `superpowers:requesting-code-review`
After implementation: `implementation-doc-sync` (scoped doc sweep)

## Writing Style Guide

**The writing style guide at `~/claude-workspace/writing-styles/blog-technical.md` is mandatory for all blog and diary entries.** Load it in full before drafting. Complete the pre-draft voice classification (I / we / Claude-named) before generating any prose. Do not show a draft without verifying it against the style guide.

## Project Artifacts

Paths that are project content (not workspace noise). Skills use this to avoid
filtering or dropping commits that touch these paths.

| Path | What it is |
|------|------------|
| `CLAUDE.md` | Project conventions |
| `docs/` | Documentation |
