# blocks-ui Workspace
**Name:** casehub-blocks-ui

**Physical path:** `/Users/mdproctor/claude/casehub/blocks-ui/CLAUDE.md`
**Symlinked at:** `/Users/mdproctor/claude/public/casehub/blocks-ui/CLAUDE.md`
**Project repo:** `/Users/mdproctor/claude/casehub/blocks-ui`
**Workspace:** `/Users/mdproctor/claude/public/casehub/blocks-ui`
**Workspace type:** public

## Session Start

Run `add-dir /Users/mdproctor/claude/casehub/blocks-ui` before any other work.

## Artifact Locations

| Skill | Writes to |
|-------|-----------|
| brainstorming (specs) | `specs/` |
| writing-plans (plans) | `plans/` |
| handover | `HANDOFF.md` |
| idea-log | `IDEAS.md` |
| design-snapshot | `snapshots/` |
| adr | `adr/` |
| write-blog | `blog/` |

## Structure

- `HANDOFF.md` — session handover (single file, overwritten each session)
- `IDEAS.md` — idea log (single file)
- `specs/` — brainstorming / design specs (superpowers output)
- `plans/` — implementation plans (superpowers output)
- `snapshots/` — design snapshots with INDEX.md (auto-pruned, max 10)
- `adr/` — architecture decision records with INDEX.md
- `blog/` — project diary entries with INDEX.md
- `design/` — epic journal (created by `epic` at branch start)

## Git Discipline

Two git repositories are active in every session:
- **Workspace** (`/Users/mdproctor/claude/public/casehub/blocks-ui`) — methodology artifacts: handover, blog (staging before publish), plans, snapshots
- **Project repo** (`/Users/mdproctor/claude/casehub/blocks-ui`) — source code, ADRs (`docs/adr/`), specs

Never rely on CWD for git operations — the session may have started in either repo. Always use explicit paths:
```bash
git -C /Users/mdproctor/claude/public/casehub/blocks-ui ...   # workspace artifacts
git -C /Users/mdproctor/claude/casehub/blocks-ui ...           # project artifacts
```
The file path determines the repo: if the file lives under `Workspace`, use the workspace path; if under `Project repo`, use the project path.

## Rules

- All methodology artifacts go here, not in the project repo
- Promotion to project repo is always explicit — never automatic
- Workspace branches mirror project branches — switch both together

## Routing

| Artifact   | Destination | Notes |
|------------|-------------|-------|
| adr        | project     | lands in `docs/adr/` |
| blog       | project     | lands in `docs/blog/` — promoted at work end |
| design     | project     | journal file lives in workspace design/; DESIGN.md merge target is project docs/DESIGN.md |
| snapshots  | workspace   | |
| specs      | project     | lands in docs/specs/ |
| plans      | workspace   | |
| handover   | workspace   | |

---

# CaseHub Blocks UI

## Project Type

type: custom

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
| `packages/blocks-ui-core/` | Tokens (re-exported from pages-ui-tokens), DataSourceMixin + DataSourceAdapter + fetchSource + createTypedFetchSource + EMPTY_DATASET (wrapping pages' DataSourceController, producing TypedDataSet via extraction pipeline), TrendSourceMixin + TrendPoint + extractTrendPoints (time-series trend data pattern), renderSparkline (shared SVG sparkline renderer), event helpers (re-exported from pages-component), domain types (TrustLevel, trustLevelFromScore, CommitmentState, CommitmentRecord, commitmentStateCategory, isTerminalCommitmentState, toCommitmentRecord, toCommitmentMap), SharedTimerController, EventStreamController, blocks-confirm-dialog, pulseAnimation, CommitmentStatePill + stateCategoryStyles (commitment-state-pill web component + category styling — promoted from commitment-viz), StatusBadge + status registry (generic status pill for all domains — lookupStatus/registerStatus with 15 built-in domains including execution/agent/pattern/conversation/epistemic, toDecoration for graph overlays), orchestration types (ExecutionState, ExecutionResult, AgentRef, AgentResult, PatternType, ExecutionModel, FailurePolicy, OrchestrationAuditEvent, ExecutionSnapshot), conversation protocol types (EpistemicStatus, ConvergenceState, ConvergenceSignal, CommonGroundState, GroundedFact, ConversationPoint, ConversationEntry, SubTaskFinding, FlagEntry, RoundMemo, ObligationChain, ConversationState), TransitionRecord (promoted from commitment-viz) |
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
| `components/audit-trail-viewer/` | Audit trail viewer — ledger entries with data-table, Merkle verification banner, attestations, actor/type/date filters, GDPR erasure handling |
| `components/blocks-timeline/` | Pluggable timeline — strategy-based content (event chronology, state progression, commitment lifecycle, orchestration events), three layouts (vertical, horizontal, compact), render callback resolution (component > strategy > default), temporal weighting, staggered axis labels, strategy-declared pagination (load-more in vertical layout, bypasses DataSourceMixin for raw JSON access). Replaces case-timeline. |
| `components/trust-score-panel/` | Trust score panel — SVG gauge, per-capability breakdown table, trend sparkline (via TrendSourceMixin, supports simulated/inline/direct data), maturity badges, compact badge mode |
| `components/similarity-panel/` | Similar past cases — similarity scores, outcomes, resolution times via pages-table. Column renderers for similarity bar and outcome badge. Dual data mode (property or endpoint). Promoted from clinical. |
| `components/compliance-summary/` | Regulation compliance grid — status badges (MET/PARTIAL/GAP/BREACHED), evidence links via pages-table. Dual data mode. Promoted from clinical. |
| `components/grouped-data-view/` | Grouped data view — items grouped by column key with per-group pages-table rendering, DataSourceMixin, group styling. Thin wrapper over pages-grouped-view. |
| `components/routing-rationale/` | Routing rationale — trust-weighted assignment explanation: score vs threshold with borderline margin, alternatives table with phase badges, policy summary. DataSourceMixin + LiveRegionMixin, inline-styled column renderers, renderCandidate callback, dual-data mode. |
| `components/trust-feedback-display/` | Post-gate trust score delta — decision/attestation badges, trust before→after with directional arrow, full card and compact inline modes. Complements trust-score-panel. Promoted from clinical. |
| `components/trust-workbench/` | Trust workbench — composes trust-score-panel + list-pane (left) and routing-rationale + trust-feedback-display (right) in split-workbench. Capability drill-down filters routing history. Inline data mode for demos. Three consumption tiers. |
| `components/sla-breach-policy/` | SLA breach escalation tiers — active tier highlighting, optional embedded sla-indicator countdown via deadline prop, shared pulseAnimation. Complements sla-indicator. Promoted from clinical. |
| `components/gdpr-erasure-action/` | GDPR data erasure form — three-phase (input → blocks-confirm-dialog confirmation → receipt), customisable subjectLabel and reasonOptions. Extends LitElement directly (no DataSourceMixin). Promoted from clinical. |
| `components/commitment-viz/` | Commitment lifecycle visualization — transition badges (`commitment-transition-badge`), range bars (compact/detailed modes), `decorateCommitmentRanges` pure function for feed decoration metadata. Props-driven, decoupled from channel-activity. Types and commitment-state-pill re-exported from blocks-ui-core (pill promoted in #101). |
| `components/channel-activity/` | Qhorus channel activity — message feed with sender grouping and threading, channel nav with keyboard navigation, member panel with presence, message input with speech-act type selector, emoji reactions, stale cursor detection. Promoted from connectors chat-demo. Extension points: formatSender, renderContent, renderContextHeader, renderError, allowedTypes/deniedTypes filtering (per protocol PP-20260713-8ea1af), channel-nav layout (sidebar/dropdown), showCreate/showDelete toggles, messageCounts |
| `components/case-explorer/` | Composable case explorer — universal entity browser with registration-based entity types. Generic components: entity-list (cursor-aware fetch, list-pane data-property mode), entity-detail (three-tier renderer resolution: sub-type → entity-type → default), entity-tree (collapsible hierarchy with lazy loading, ARIA tree, M-of-N groups), entity-command-bar (MCP-tools-style dynamic commands with confirmation), case-explorer (full split-workbench composition with NavigationController, entity type tabs, list/tree mode, breadcrumbs). Presets: caseInstanceType, workerType, caseDefinitionType, gateType, channelType. Convenience wrappers: case-instance-list, worker-list, case-definition-browser, case-detail-panel, worker-detail-panel. Domain customisation via columnRenderers, detailRenderer, detailRendererMap, nodeRenderer, filters. |
| `components/preferences-editor/` | Preferences editor — tree-table UI for scope-aware preference management. Scope hierarchy (system → tenant → team → user) with preference key-value pairs as leaves. Type-aware inline editors (string, integer, number, boolean, duration, enum) driven by PreferenceSchemaDescriptor from platform REST API. Inheritance computation (local, inherited, overridden, default) with source scope badges. PreferencesApi REST client, ValueEditor sub-component. |
| `components/session-list/` | Session list — claudony session table with status badges (ACTIVE/WAITING/IDLE), inline spawn form, delete/restart actions with failure recovery. Uses raw array + fromRows pattern (like work-item-inbox), emitPagesEvent for selection/change events. Types: SessionResponse, SessionStatus, CreateSessionRequest, GitStatusResponse, PortStatus. |
| `components/session-detail/` | Session detail — tabbed detail pane for a selected session: Terminal (polling output), Git (branch/PR/checks), Health (port status via pages-table), Events (SSE via SSEManager). Tab lifecycle manages timers and SSE connections. Listens for session:selected/deselected events. |
| `components/execution-monitor/` | Execution monitor — SSE-driven live execution state for orchestration framework. State badge (7 states), pattern badge (8 types), execution model summary, agent roster with type/result badges. Dual data mode (SSE endpoint + inline property). Staleness detection. Render callbacks: renderAgent, renderModel. |
| `components/orchestration-workbench/` | Orchestration workbench — composes execution-monitor (left) + blocks-timeline with orchestration-events strategy (right) in split-workbench. Selection coordination between agent roster and audit timeline. Three consumption tiers (standalone, panel-hosted, inline). |
| `packages/diagram-core/` | Shared diagram orchestration — DiagramBaseMixin (undo/redo, render pipeline, dirty tracking, persistence, keyboard shortcuts, src fetch, error/degraded/readonly modes), DiagramToolbar (save/dirty), DiagramProperties (generic schema-driven property panel), form utilities (field-renderer, validation, trigger-editor, nested-group, property-form) |
| `packages/graph-stencil-case/` | Case domain adapter (YAML ↔ graph), structural stencils (Binding, Worker with SWF thumbnail + drill-down + function type badge, Milestone, Goal, SubCase) registered via pages StencilDescriptor API, ThumbnailRenderer SPI (registerThumbnailRenderer/getThumbnailRenderer), runtime module (RuntimeAdapter — toDecorations with active-worst-first aggregation, TaskStatus/MilestoneLifecycleStatus badge mappings, CaseRuntimeState types), GitHubBackend persistence, YAML editor (addElement, removeElement, switchBindingTarget, applyPropertyEdit, switchFunctionType, switchMcpTransport, switchModelProvider), worker-function module (WorkerFunctionType detection, AgentConfig/A2AConfig/McpConfig/AuthConfig types, function type defaults, form renderers for agent/a2a/mcp/sequence/unknown + shared auth config) |
| `packages/graph-stencil-swf/` | SWF domain adapter (toSwfGraph — dual YAML walk with SDK buildFlatGraph, type prefixing, degraded mode), SWF stencils (call with sub-type icons, set, switch, raise, try, try-catch, boundary nodes, generic fallback), edge types (flow, switch-case), applySwfPropertyEdit (CST-preserving), swfTaskSchema (static JSON Schema), createSwfThumbnailRenderer (SVG thumbnail with caching) |
| `packages/graph-stencil-htn/` | HTN/DAG domain adapter — TypeScript types mirroring engine sealed interfaces (TaskNodeSnapshot, DagPlanSnapshot, DagNodeSnapshot, NodeStateSnapshot, DagResultSnapshot, PlanItemDefinition, CasePlanModelSnapshot), DAG adapter (dagToGraph with entry/exit detection and taskIdToGraphNodeId index), dag-node stencil (join indicators, executor badges), runtime module (dagToDecorations via node: status domain, nodeStatesToTaskStates bridge), local toDecoration (duplicated from graph-stencil-case per §13) |
| `components/casehub-diagram/` | CaseHub visual diagram — editor component for CaseDefinition YAML. Extends DiagramBaseMixin from diagram-core. Case-specific: stencil registration, palette (add nodes), runtime overlay (runtimeState, design/runtime mode toggle, staleness indicator), binding target switching, structural editing (add/remove/switchTarget with dependency checks), worker inline expand with ELK per-node size overrides. |
| `components/blocks-dag-viewer/` | DAG execution graph viewer — read-only graph wrapping pages-graph-canvas with ELK layout. Toolbar with dispatch mode badge, summary stats, staleness timer (setInterval + disconnectedCallback cleanup). Decoration-only update path (skip ELK on dagResult change). Async render guard using DagPlanSnapshot.timestamp as plan identity. Node selection via selectionTopic with taskId payload. |
| `components/blocks-decomposition-tree/` | HTN decomposition tree — recursive ARIA tree for CompoundTask → DecompositionMethod → children hierarchy. 8 strategy badge colours + unknown fallback, guard label display, selectedMethodIndex highlighting, nodeStates-driven status badges on leaves. Render callbacks (renderLeaf, renderMethod) per component-customisation protocol PP-20260713-8ea1af. Tree ↔ DAG coordination via shared selectionTopic with taskId. |
| `components/blocks-plan-item-tree/` | PlanItemDefinition tree — recursive ARIA tree for Primitive/Compound plan item hierarchy. CompletionSemantics badges (All/M-of-N/FirstWins), DispatchMode pills (ORCHESTRATED/CHOREOGRAPHED), repeatable indicators, entry condition display. Render callbacks (renderPrimitive, renderCompound). |
| `components/blocks-plan-model-dashboard/` | CasePlanModel dashboard — card-based grid layout: agenda table with status badges, focus area with rationale, resource budget key-value pairs, sub-case list with case status, compound definition progress bars. |
| `components/session-workbench/` | Session workbench — composition shell for session management. Composes session-list + session-detail in split-workbench with selection-topic="session". KeyboardShortcutMixin for overlay. configure() method for hostPanel integration. |
| `components/conversation-viewer/` | Conversation protocol viewer — convergence indicator (status bar with confidence fill + state colour), common ground panel (three-column epistemic layout: established/pending/disputed), point list (round-grouped with selection events), point detail (entry thread, sub-task findings, obligation chains via commitment-viz, flags), conversation workbench (split-workbench composition with KeyboardShortcutMixin + LiveRegionMixin, stale selection guard, configure() for hostPanel). Property-based data delivery (ConversationState). |
| `components/swf-diagram/` | SWF workflow diagram — standalone canvas for Serverless Workflow YAML. Extends DiagramBaseMixin, delegates to toSwfGraph/applySwfPropertyEdit, defaults schema to swfTaskSchema. No structural editing (read-only + property editing). Degraded mode banner when YAML path sync fails. |

## Design Philosophy

- Components should be framework-agnostic Web Components where possible
- Each component defines its dataset contract (what data shape it consumes)
- Components communicate via `pages-event` CustomEvent — no direct component-to-component coupling
- Components should work standalone in a test harness AND embedded via pages `hostPanel`
- Visual consistency through `--pages-*` CSS custom properties from `pages-ui-tokens`
- Design for the full platform: trust scores from ledger, channel activity from qhorus, case timelines from engine, IoT device state from iot

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

## Work Tracking

Issue tracking: enabled
GitHub repo: casehubio/blocks-ui
Changelog: GitHub Releases
