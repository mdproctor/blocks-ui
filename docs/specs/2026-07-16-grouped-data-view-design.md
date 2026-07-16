# grouped-data-view — Design Spec

**Issue:** #53
**Date:** 2026-07-16
**Status:** Draft

## Overview

A thin blocks-ui wrapper over `pages-grouped-view` (casehub-pages#188) that adds
DataSourceMixin dual data mode, per-group styling, and platform event integration.
Renders items grouped by a key column as collapsible sections, each containing a
`pages-table` with full column renderer support.

## Architecture

```
┌─────────────────────────────────────────────────┐
│  <grouped-data-view>  (blocks-ui, LitElement)   │
│  DataSourceMixin · group styling · events       │
│                                                 │
│  ┌─────────────────────────────────────────────┐│
│  │  <pages-grouped-view>  (pages-viz)          ││
│  │  groupBy · expand/collapse · aggregations   ││
│  │                                             ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐    ││
│  │  │pages-table│ │pages-table│ │pages-table│   ││
│  │  │ group A   │ │ group B   │ │ group C   │   ││
│  │  └──────────┘ └──────────┘ └──────────┘    ││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

The wrapper bridges two rendering models:
- `pages-grouped-view` extends `PagesElement` (imperative, `props`/`dataSet` setters)
- `grouped-data-view` extends `DataSourceMixin(LitElement)` (reactive)

In `willUpdate`/`updated`, the wrapper converts and forwards properties:
```typescript
if (!this.groupBy || !this.dataSet) return;

// Convert string groupBy to GroupingKey
const groupingKey = this._toGroupingKey(this.groupBy);

this._groupedView.props = { groupBy: groupingKey, columnConfig, rowStyle, ... };

// ALWAYS sort dataset to ensure group adjacency — extractGroupBoundaries()
// is a transition scan that produces duplicate groups on interleaved data.
// When groupOrder is set, apply explicit ordering; otherwise sort by column value.
const preparedDataSet = this._prepareDataSet(this.dataSet, this.groupBy, this.groupOrder);
this._groupedView.dataSet = preparedDataSet;

// Group styling via setGroupStyles() — PagesGroupedView applies during render
this._groupedView.setGroupStyles((name: string) =>
  this.groupStyle?.(name) ?? this.groupConfig?.get(name));

this._groupedView.setColumnRenderers(this.columnRenderers);
```

### Element registration prerequisite

The wrapper creates `<pages-grouped-view>` via `document.createElement()`. The
consuming application must ensure the `pages-grouped-view` custom element is
registered before `grouped-data-view` renders. This typically happens via a
side-effect import of `@casehubio/pages-viz/grouped-view`.

### Data request suppression

The wrapper never includes `lookup` in the `GroupedViewProps` it forwards to
`pages-grouped-view`. This is a correctness invariant: `PagesElement.connectedCallback()`
calls `requestDataIfNeeded()` which dispatches `pages-data-request` when `props.lookup`
is set. Since the wrapper manages data (via DataSourceMixin endpoint or hosted push),
allowing a lookup would trigger a duplicate request against a non-existent runtime pipeline.

## Component Contract

### Data (DataSourceMixin)

| Property | Type | Description |
|----------|------|-------------|
| `endpoint` | `string` | Fetch mode — URL for data, fetched via DataSourceMixin's source factory |

The wrapper supports two data modes, both provided by DataSourceMixin:

1. **Standalone (endpoint):** Set `endpoint` as HTML attribute or via `configure()`.
   DataSourceMixin self-fetches via its source factory and populates `dataSet`.
2. **Hosted (pipeline push):** Pages runtime pushes data via `DataReceiver` setters
   (`component.dataSet = result`, `component.loading = true`). DataSourceMixin's
   getters/setters delegate to the adapter, which delegates to the controller.

DataSourceMixin delivers `dataSet` as `TypedDataSet | undefined`. The wrapper
forwards this directly to `pages-grouped-view` — no conversion needed since both
use `TypedDataSet` from `@casehubio/pages-data`.

### Grouping

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `groupBy` | `string` | required | Column ID to group by |
| `groupOrder` | `string[]` | data order | Explicit group ordering |
| `preset` | `'sectioned' \| 'spreadsheet' \| 'list'` | `'sectioned'` | Passthrough to pages-grouped-view |
| `defaultExpanded` | `boolean` | `true` | Whether groups start expanded |

#### groupBy conversion

The wrapper converts the `groupBy` string to a `GroupingKey` for PagesGroupedView:

```typescript
private _toGroupingKey(columnId: string): GroupingKey {
  return {
    sourceId: columnId as ColumnId,
    columnId: columnId as ColumnId,
    strategy: { mode: 'distinct' },
    maxIntervals: 100,
    emptyIntervals: false,
    ascendingOrder: true,
  };
}
```

The wrapper intentionally restricts to `distinct` grouping strategy. Non-distinct
strategies (`fixedCalendar`, `dynamicRange`) are analytics concepts handled by
`pages-grouped-view` directly — blocks-ui consumers group by discrete domain
values (lane, queue, status).

#### Dataset preparation — group adjacency and ordering

`extractGroupBoundaries()` in PagesGroupedView is a transition-scan algorithm —
it detects value changes in the key column, not distinct-value grouping. If the
dataset has interleaved values (e.g. API returns rows sorted by date, not by lane),
it produces duplicate groups. In the pages YAML pipeline, `applyGroupSequence()`
handles this. In blocks-ui's endpoint mode, no such pipeline runs.

The wrapper ALWAYS sorts the dataset by the groupBy column before forwarding,
via `_prepareDataSet()`:

```typescript
private _prepareDataSet(
  ds: TypedDataSet,
  keyColumn: string,
  groupOrder?: string[],
): TypedDataSet {
  const colId = keyColumn as ColumnId;

  if (groupOrder) {
    const orderIndex = new Map(groupOrder.map((name, i) => [name, i]));
    const sorted = [...ds.rows].sort((a, b) => {
      const aName = String(a.cell(colId).value ?? '');
      const bName = String(b.cell(colId).value ?? '');
      const aIdx = orderIndex.get(aName) ?? groupOrder.length;
      const bIdx = orderIndex.get(bName) ?? groupOrder.length;
      if (aIdx !== bIdx) return aIdx - bIdx;
      // Tiebreak: group by name so different unordered groups don't interleave
      return aName < bName ? -1 : aName > bName ? 1 : 0;
    });
    return { columns: ds.columns, rows: sorted };
  }

  // No explicit order — sort by column value to ensure group adjacency
  const sorted = [...ds.rows].sort((a, b) => {
    const aName = String(a.cell(colId).value ?? '');
    const bName = String(b.cell(colId).value ?? '');
    return aName < bName ? -1 : aName > bName ? 1 : 0;
  });
  return { columns: ds.columns, rows: sorted };
}
```

When `groupOrder` is set: ordered groups appear first in the specified order,
unordered groups appear after all ordered groups sorted alphabetically. The
name-based tiebreaker ensures rows from different unordered groups are never
interleaved.

When `groupOrder` is not set: groups appear in alphabetical order by column
value. Row order within each group is preserved (stable sort).

### Group Styling

Two mechanisms, applied in order: callback wins when present, map is the fallback.

```typescript
interface GroupStyleConfig {
  readonly label?: string;
  readonly className?: string;
  readonly icon?: string;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `groupConfig` | `Map<string, GroupStyleConfig>` | Declarative per-group styling |
| `groupStyle` | `(groupName: string) => GroupStyleConfig \| undefined` | Callback override |

Resolution: `groupStyle(name) ?? groupConfig.get(name) ?? { }`.

#### Styling mechanism

Group header styling is applied via PagesGroupedView's `setGroupStyles()` setter
method (new API — see §PagesGroupedView API Extension). The wrapper passes a
resolved styling function that PagesGroupedView calls during `render()` for each
group header:

```typescript
this._groupedView.setGroupStyles((groupName: string) => {
  return this.groupStyle?.(groupName) ?? this.groupConfig?.get(groupName);
});
```

This avoids shadow DOM piercing and survives PagesGroupedView's reconciliation
path naturally — styling is applied as part of the render, not post-processed.

#### PagesGroupedView API extension (prerequisite)

PagesGroupedView needs a new imperative setter following the existing pattern
(`setColumnRenderers`, `setGetRowKey`, `setGetRowDetail`, `setGetRowClass`):

```typescript
// In PagesGroupedView:
private _groupStyles: ((name: string) => GroupStyleConfig | undefined) | undefined;

setGroupStyles(fn: ((name: string) => GroupStyleConfig | undefined) | undefined): void {
  this._groupStyles = fn;
  this.update(); // re-render to apply
}
```

The render method applies the style when creating group headers — adding the
`className` to the section element, replacing the label text, and prepending
the icon string. This is a targeted addition to `pages-viz`, filed as
casehub-pages#TBD.

### pages-table Passthrough

| Property | Type | Description |
|----------|------|-------------|
| `columnConfig` | `readonly TableColumnConfig[]` | Column definitions |
| `columnRenderers` | `ReadonlyMap<ColumnId, ColumnRenderer>` | Custom cell rendering |
| `rowStyle` | `readonly RowStyleRule[]` | Conditional row styling |
| `selection` | `SelectionMode` | Row selection mode |
| `sortable` | `boolean` | Enable column sorting |

All forwarded to `pages-grouped-view`, which forwards to per-group `pages-table` instances.

### Events

The wrapper captures events from the inner components and re-dispatches them as
`pages-event` CustomEvents with its own topic namespace.

| Topic | Payload | Source | Mechanism |
|-------|---------|--------|-----------|
| `grouped-data.group-toggle` | `{ group: string, expanded: boolean }` | PagesGroupedView `pages-event` with topic `group-toggle` | Intercept and re-dispatch |
| `grouped-data.row-activated` | `{ row: TypedRow, key?: string }` | pages-table `row-activate` CustomEvent | Capture framework event, emit as `pages-event` |

```typescript
export const GroupedDataViewTopics = {
  GROUP_TOGGLE: 'grouped-data.group-toggle',
  ROW_ACTIVATED: 'grouped-data.row-activated',
} as const;
```

#### Event capture mechanism

**group-toggle:** PagesGroupedView dispatches `pages-event` with `{ topic: 'group-toggle',
payload: { group, expanded } }` using `bubbles: true, composed: true`. The wrapper
listens on its shadow root for `pages-event` events with topic `group-toggle` and
re-dispatches with the namespaced topic:

```typescript
// In connectedCallback:
this._groupedView.addEventListener('pages-event', (e: CustomEvent) => {
  if (e.detail.topic === 'group-toggle') {
    e.stopPropagation();
    emitPagesEvent(this, GroupedDataViewTopics.GROUP_TOGGLE, e.detail.payload);
  }
});
```

`stopPropagation()` prevents the original `group-toggle` event (dispatched with
`composed: true`) from leaking past the wrapper. Without it, consumers would
receive both the raw `group-toggle` and the namespaced `grouped-data.group-toggle`.

**row-activated:** pages-table dispatches `row-activate` as a framework-level
CustomEvent (not a `pages-event` topic) with `RowActivateDetail { row, key? }`.
Since pages-table uses `composed: true`, the event crosses shadow DOM boundaries.
The wrapper captures it, stops propagation, and translates to a `pages-event`:

```typescript
// In connectedCallback:
this._groupedView.addEventListener('row-activate', (e: CustomEvent) => {
  e.stopPropagation();
  emitPagesEvent(this, GroupedDataViewTopics.ROW_ACTIVATED, e.detail);
});
```

#### Topic naming convention

Topics use dot-separated segments (`grouped-data.group-toggle`), consistent with
the blocks-ui convention established by existing components (`commitment.stage-changed`,
`gdpr.erasure-completed`, `precedent.selected`). PP-20260705-bac842 mandates
colon-separated topics but its scope is `casehub-pages` — blocks-ui components
use dot-separated topics consistently.

### API

| Method | Description |
|--------|-------------|
| `configure(props)` | Programmatic setup — sets all properties atomically |
| `refresh()` | Re-fetch data from endpoint |

#### configure() override

The wrapper overrides `configure()` to handle component-specific properties before
delegating to the mixin:

```typescript
override configure(props: Record<string, unknown>): void {
  if (props.groupBy !== undefined) this.groupBy = props.groupBy as string;
  if (props.groupOrder !== undefined) this.groupOrder = props.groupOrder as string[];
  if (props.groupConfig !== undefined) this.groupConfig = props.groupConfig as Map<string, GroupStyleConfig>;
  if (props.groupStyle !== undefined) this.groupStyle = props.groupStyle as (name: string) => GroupStyleConfig | undefined;
  if (props.columnConfig !== undefined) this.columnConfig = props.columnConfig as readonly TableColumnConfig[];
  if (props.columnRenderers !== undefined) this.columnRenderers = props.columnRenderers as ReadonlyMap<ColumnId, ColumnRenderer>;
  if (props.rowStyle !== undefined) this.rowStyle = props.rowStyle as readonly RowStyleRule[];
  if (props.selection !== undefined) this.selection = props.selection as SelectionMode;
  if (props.sortable !== undefined) this.sortable = props.sortable as boolean;
  if (props.preset !== undefined) this.preset = props.preset as 'sectioned' | 'spreadsheet' | 'list';
  if (props.defaultExpanded !== undefined) this.defaultExpanded = props.defaultExpanded as boolean;
  super.configure(props);
}
```

Follows the `case-timeline` pattern from the DataSourceMixin spec: set
component-specific properties, then call `super.configure()` which defers
`syncEndpoint()` + `refresh()` via microtask.

### CSS Custom Properties

Inherits all `--pages-*` tokens. Group header styling uses the `className` from
`GroupStyleConfig` — consumers define the actual CSS rules in their own stylesheets.

## What This Component Does NOT Own

- **Metrics** — use `kpi-metric-row` alongside, composed by the app
- **Active batches** — separate table, composed by the app
- **Domain-specific column renderers** — provided by consumer via `columnRenderers`
- **Data grouping logic** — owned by `pages-grouped-view` / `extractGroupBoundaries()`
- **Per-group table rendering** — owned by `pages-grouped-view` composing `pages-table`

## Consumer Examples

### DevTown merge queue

```html
<grouped-data-view
  endpoint="/api/merge-queue"
  group-by="lane"
  .groupOrder=${['CRITICAL', 'HIGH', 'NORMAL']}
  .groupConfig=${new Map([
    ['CRITICAL', { className: 'lane-critical', icon: '🔴' }],
    ['HIGH',     { className: 'lane-high',     icon: '🟠' }],
    ['NORMAL',   { className: 'lane-normal',   icon: '🟢' }],
  ])}
  .columnConfig=${prColumnConfig}
  .columnRenderers=${prRenderers}
  sortable
></grouped-data-view>
```

### Work-item-inbox "all queues" view

```html
<grouped-data-view
  endpoint="/api/work-items"
  group-by="queueName"
  .columnConfig=${workItemColumns}
  .columnRenderers=${workItemRenderers}
  preset="sectioned"
></grouped-data-view>
```

## Protocol Compliance

Follows PP-20260713-8ea1af:
1. **Typed config properties** — `groupConfig`, `columnConfig`, `groupOrder`
2. **Optional render callbacks** — `groupStyle` callback overrides declarative config
3. **Mixin extension points** — inherits `createSourceFactory()` and `resolveEndpoint()` from DataSourceMixin, available for subclass override if needed (not overridden by default)

No content slots — group styling and column rendering via typed properties and callbacks.

## Dependencies

- `@casehubio/blocks-ui-core` — DataSourceMixin, emitPagesEvent
- `@casehubio/pages-table` — TableColumnConfig, ColumnRenderer, SelectionMode, RowActivateDetail
- `@casehubio/pages-viz` — PagesGroupedView (runtime composition via `document.createElement`)
- `@casehubio/pages-component` — GroupedViewProps, RowStyleRule, GroupingKey
- `@casehubio/pages-data` — TypedDataSet, TypedRow, ColumnId

## Prerequisites

- **PagesGroupedView `setGroupStyles()` API** — new setter method on PagesGroupedView
  following the established pattern. Filed as casehub-pages#TBD.

## Testing Strategy

### _toGroupingKey()
- Converts string column ID to GroupingKey with `distinct` strategy
- Sets `sourceId` and `columnId` to the provided column ID

### _prepareDataSet()
- **Interleaved data:** rows `[A, B, A, B]` produce two groups, not four
- **groupOrder specified:** ordered groups first in specified order, unordered groups after, sorted alphabetically
- **groupOrder not specified:** groups in alphabetical order by column value
- **Stable within-group order:** rows within same group preserve original relative order
- **Empty dataset:** returns empty dataset without error
- **All rows same group:** single group, all rows preserved
- **Unordered tiebreaker:** two different unordered groups are never interleaved (name-based tiebreaker)

### Group styling resolution
- `groupStyle` callback returns config → used
- `groupStyle` returns `undefined` → falls back to `groupConfig` map
- Neither returns config → empty object (no styling applied)
- `groupStyle` absent, `groupConfig` present → map used

### Event capture
- `group-toggle` from PagesGroupedView intercepted, re-dispatched as `grouped-data.group-toggle`
- `row-activate` from pages-table captured, translated to `grouped-data.row-activated`
- Original events stopped (`stopPropagation`) — consumers see only namespaced events
- Payload forwarded unchanged (no field loss or mutation)

### DataSourceMixin integration
- `endpoint` set → fetch triggers → `dataSet` populated → PagesGroupedView renders
- Hosted push: `component.dataSet = typedDataSet` → forwarded to PagesGroupedView
- `loading` state propagated to wrapper's loading display
- `error` state propagated to wrapper's error display

### configure()
- All properties set before microtask fires
- `super.configure()` called after component-specific properties
- Re-configuration with changed endpoint triggers re-fetch
- Re-configuration with unchanged endpoint but changed groupBy triggers re-render

### Data request suppression
- No `pages-data-request` dispatched when `pages-grouped-view` connects
- Verified: forwarded props never include `lookup`

### Edge cases
- `groupBy` column not present in dataset columns → graceful handling (empty groups)
- `groupOrder` references groups not in dataset → ignored (no empty placeholder groups)
- Dataset arrives before `groupBy` is set → no render until both present

## Package Structure

```
components/grouped-data-view/
  package.json
  tsconfig.json
  src/
    grouped-data-view.ts
    grouped-data-view.test.ts
    types.ts
  examples/
    showcase.html
```
