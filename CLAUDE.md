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
| blog       | workspace   | staged here; published to mdproctor.github.io via publish-blog |
| design     | project     | journal file lives in workspace design/; DESIGN.md merge target is project docs/DESIGN.md |
| snapshots  | workspace   | |
| specs      | project     | lands in project `docs/` |
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
- [UI Architecture](https://raw.githubusercontent.com/casehubio/parent/main/docs/platform/ui-architecture.md) — pages → blocks-ui → app layering
- [This repo's deep-dive](https://raw.githubusercontent.com/casehubio/parent/main/docs/repos/casehub-blocks-ui.md)

## Repository Role

Reusable, domain-aware UI components that multiple CaseHub applications share. Consumes casehub-pages APIs. Framework-agnostic Web Components where possible.

**Peer repos (each has its own Claude session — do not commit to these):**
platform, eidos, ledger, connectors, iot, work, worker, qhorus, pages, engine, claudony, openclaw, neural-text, devtown, aml, clinical, drafthouse, life, quarkmind, flow, soc, fsitrading, ras, ops, workers, desiredstate, blocks

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
| `packages/blocks-ui-core/` | Tokens (re-exported from pages-ui-tokens), DataSourceMixin + DataSourceAdapter + fetchSource + createTypedFetchSource + EMPTY_DATASET (wrapping pages' DataSourceController, producing TypedDataSet via extraction pipeline), TrendSourceMixin + TrendPoint + extractTrendPoints (time-series trend data pattern), renderSparkline (shared SVG sparkline renderer), event helpers (re-exported from pages-component), domain types (TrustLevel, trustLevelFromScore), SharedTimerController, EventStreamController, blocks-confirm-dialog, pulseAnimation |
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
| `components/blocks-timeline/` | Pluggable timeline — strategy-based content (event chronology, state progression, commitment lifecycle), three layouts (vertical, horizontal, compact), render callback resolution (component > strategy > default), temporal weighting, staggered axis labels, strategy-declared pagination (load-more in vertical layout, bypasses DataSourceMixin for raw JSON access). Replaces case-timeline. |
| `components/trust-score-panel/` | Trust score panel — SVG gauge, per-capability breakdown table, trend sparkline (via TrendSourceMixin, supports simulated/inline/direct data), maturity badges, compact badge mode |
| `components/similarity-panel/` | Similar past cases — similarity scores, outcomes, resolution times via pages-table. Column renderers for similarity bar and outcome badge. Dual data mode (property or endpoint). Promoted from clinical. |
| `components/compliance-summary/` | Regulation compliance grid — status badges (MET/PARTIAL/GAP/BREACHED), evidence links via pages-table. Dual data mode. Promoted from clinical. |
| `components/grouped-data-view/` | Grouped data view — items grouped by column key with per-group pages-table rendering, DataSourceMixin, group styling. Thin wrapper over pages-grouped-view. |
| `components/routing-rationale/` | Routing rationale — trust-weighted assignment explanation: score vs threshold with borderline margin, alternatives table with phase badges, policy summary. DataSourceMixin + LiveRegionMixin, inline-styled column renderers, renderCandidate callback, dual-data mode. |
| `components/trust-feedback-display/` | Post-gate trust score delta — decision/attestation badges, trust before→after with directional arrow, full card and compact inline modes. Complements trust-score-panel. Promoted from clinical. |
| `components/trust-workbench/` | Trust workbench — composes trust-score-panel + list-pane (left) and routing-rationale + trust-feedback-display (right) in split-workbench. Capability drill-down filters routing history. Inline data mode for demos. Three consumption tiers. |
| `components/sla-breach-policy/` | SLA breach escalation tiers — active tier highlighting, optional embedded sla-indicator countdown via deadline prop, shared pulseAnimation. Complements sla-indicator. Promoted from clinical. |
| `components/gdpr-erasure-action/` | GDPR data erasure form — three-phase (input → blocks-confirm-dialog confirmation → receipt), customisable subjectLabel and reasonOptions. Extends LitElement directly (no DataSourceMixin). Promoted from clinical. |
| `components/channel-activity/` | Qhorus channel activity — message feed with sender grouping and threading, channel nav with keyboard navigation, member panel with presence, message input with speech-act type selector, emoji reactions, stale cursor detection. Promoted from connectors chat-demo. Extension points: formatSender, renderContent, renderContextHeader, renderError, allowedTypes/deniedTypes filtering (per protocol PP-20260713-8ea1af), channel-nav layout (sidebar/dropdown), showCreate/showDelete toggles, messageCounts |
| `components/case-explorer/` | Composable case explorer — universal entity browser with registration-based entity types. Generic components: entity-list (cursor-aware fetch, list-pane data-property mode), entity-detail (three-tier renderer resolution: sub-type → entity-type → default), entity-tree (collapsible hierarchy with lazy loading, ARIA tree, M-of-N groups), entity-command-bar (MCP-tools-style dynamic commands with confirmation), case-explorer (full split-workbench composition with NavigationController, entity type tabs, list/tree mode, breadcrumbs). Presets: caseInstanceType, workerType, caseDefinitionType, gateType, channelType. Convenience wrappers: case-instance-list, worker-list, case-definition-browser, case-detail-panel, worker-detail-panel. Domain customisation via columnRenderers, detailRenderer, detailRendererMap, nodeRenderer, filters. |

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
