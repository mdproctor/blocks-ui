# Align blocks-ui table components with pages pipeline

**Issue:** casehubio/blocks-ui#95
**Date:** 2026-07-25
**Status:** Draft

## Problem

blocks-ui table components were written before the pages unified pipeline API existed. They manually fetch data, build `TypedDataSet` via `fromRows()` at render time, and manage their own loading/error state — bypassing the pipeline (`DataSource → SourceConnector → DataSourceController`) that pages now provides for both dynamic and static table usage.

This causes: duplicated data lifecycle code across components, visual inconsistencies (dark mode hover broken because `--pages-surface-hover` fallback is light-only), missed pipeline features (sortable columns that don't sort, unhandled pagination), and divergence that compounds as pages evolves.

## Approach

Align all 10 affected components onto the pages pipeline. DataSourceMixin (or DataSourceAdapter for SSE) is the Lit integration layer. No component manually calls `fetch()`, builds `fromRows()` at render time, or manages its own loading/error state.

The table element (`pages-data-table`) stays in standalone mode — `client-sort`, `client-filter`, pagination complement the pipeline by handling interaction locally. Pipeline mode (`.props` setter, `_pipelineMode = true`) is for the pages framework runtime only.

This is the first step in ongoing pages/blocks-ui alignment work.

## Dual-data pattern

Components supporting both inline data (property) and remote data (endpoint) follow one standard:

- **Endpoint mode**: DataSourceMixin's sourceFactory creates the DataSource, data flows through the controller, arrives as `this.dataSet`.
- **Property mode**: data enters the pipeline at the controller level — `adapter.controller.dataSet = fromRows(data, columns)`. The controller's loading/error/dataSet state machine applies identically.

In `willUpdate`:
- Property data changed → set on adapter controller directly
- Property cleared and endpoint set → adapter triggers fetch

This replaces the current pattern where components set `this.dataSet` (the mixin's reactive property) directly, bypassing the controller's state machine.

## Component tiers

### Tier 1 — Already on the pipeline (cleanup only)

**list-pane** — Uses DataSourceMixin correctly. Verify `client-sort` and `client-filter` are wired. No structural change.

### Tier 2 — On the mixin but bypassing it (remove bypasses)

**compliance-summary** — Remove `willUpdate` bypass that calls `fromRows()` when `requirements` property is set. Push inline data through the adapter controller. Add `client-sort` (sortable columns exist but sort does nothing).

**similarity-panel** — Same pattern as compliance-summary. Remove `willUpdate` fromRows bypass, push inline data through controller. Add `client-sort`.

**routing-rationale** — Same pattern. Remove `willUpdate` fromRows bypass for `data` property path. No sorting (read-only candidates table).

**trust-score-panel** — Builds the dataset twice: once in sourceFactory (pushed to sink) and again in `_renderCapabilityTable()` from raw data. Remove the duplicate. sourceFactory transforms the API response into capability score rows and pushes through the pipeline once. Render uses `this.dataSet`.

### Tier 3 — Not on the pipeline (adopt it)

**work-item-inbox** — Manual `fetch()` + SSE + `fromRows()` on every render + manual filtering. Adopt DataSourceAdapter with sourceFactory for initial fetch. SSE updates modify the adapter's dataset (insert/remove/update rows). Domain filtering (mode/status/priority/overdue/breach) stays as component logic — filtered result pushed through the controller. Remove `fromRows()` from the render path.

**audit-trail-viewer** — Uses two DataSourceAdapters but bypasses the dataset pipeline: stores raw entries in component state, pushes empty datasets to the sink for loading/error tracking only. Refactor to DataSourceMixin. sourceFactory fetches entries, transforms, pushes real dataset through the pipeline. Domain-specific multi-field filters (actor/type/date) stay as component logic applied before passing to the table. The verify adapter stays separate (distinct operation, not table data).

**preferences-editor** — Manual `PreferencesApi` fetch, manual `_buildDataSet()` with `fromRows()`, manual `_buildRows()` tree walking. Adopt DataSourceAdapter. sourceFactory wraps PreferencesApi — fetches schema + scoped values, builds tree rows, pushes through pipeline. Tree-building logic moves into sourceFactory transform. `pages-data-table` continues using `.props` for expandable tree config (correct API for tree tables).

### Tier 4 — Composition (align with children)

**trust-workbench** — Currently imperatively sets `listPane.dataSet = fromRows(...)` or `listPane.endpoint`. After list-pane is aligned, pass endpoint or inline data to list-pane's properties — list-pane's pipeline handles it. Remove direct `fromRows()` in `_syncListPane()`.

**grouped-data-view** — Uses DataSourceMixin but imperatively creates `pages-grouped-view`. Keep imperative creation (different element type). The mixin delivers the dataset, the component groups/sorts it, passes to `pages-grouped-view` via the pipeline flow.

## Table element tag

The dist registers `pages-table`, the source has `@customElement('pages-data-table')`. Nine components use `<pages-table>`, preferences-editor uses `<pages-data-table>`. Standardise on whichever the current pages version registers — verify during implementation and align all components to one tag.

## Testing

Each component has existing tests. The refactor changes internal data flow, not external API (properties, events, rendered output). Tests should continue passing with updates to test setup where the pipeline now handles dataset construction.

New tests per component: verify dual-data pattern works (property data → controller, endpoint → pipeline fetch, switching between them).

## Scope boundaries

- This refactor does NOT switch any component to pipeline mode (`.props` setter / `_pipelineMode`).
- This refactor does NOT introduce `pages-grid-table` — all components use `pages-data-table` in standalone mode.
- SSE lifecycle in work-item-inbox is preserved — SSE updates feed into the pipeline, they don't replace it.
- Domain-specific filtering logic stays in components — it's not table filtering, it's business logic.

## Affected files

| Component | Source file |
|-----------|------------|
| list-pane | `components/list-pane/src/list-pane.ts` |
| compliance-summary | `components/compliance-summary/src/compliance-summary.ts` |
| similarity-panel | `components/similarity-panel/src/similarity-panel.ts` |
| routing-rationale | `components/routing-rationale/src/routing-rationale.ts` |
| trust-score-panel | `components/trust-score-panel/src/trust-score-panel.ts` |
| work-item-inbox | `components/work-item-inbox/src/work-item-inbox.ts` |
| audit-trail-viewer | `components/audit-trail-viewer/src/audit-trail-viewer.ts` |
| preferences-editor | `components/preferences-editor/src/preferences-editor.ts` |
| trust-workbench | `components/trust-workbench/src/trust-workbench.ts` |
| grouped-data-view | `components/grouped-data-view/src/grouped-data-view.ts` |
| DataSourceMixin | `packages/blocks-ui-core/src/data-source/data-source-mixin.ts` |
| DataSourceAdapter | `packages/blocks-ui-core/src/data-source/data-source-adapter.ts` |
