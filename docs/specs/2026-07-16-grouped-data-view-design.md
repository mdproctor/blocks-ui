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
// Convert string groupBy to GroupingKey
const groupingKey: GroupingKey = {
  sourceId: this.groupBy as ColumnId,
  columnId: this.groupBy as ColumnId,
  strategy: { mode: 'distinct' },
  maxIntervals: 100,
  emptyIntervals: false,
  ascendingOrder: true,
};

this._groupedView.props = { groupBy: groupingKey, columnConfig, rowStyle, ... };

// Apply groupOrder by sorting dataset rows before forwarding
const orderedDataSet = this.groupOrder
  ? this._reorderByGroup(this.dataSet, this.groupBy, this.groupOrder)
  : this.dataSet;
this._groupedView.dataSet = orderedDataSet;

// Apply group styling after render (synchronous — PagesElement.update()
// completes within the dataSet setter call chain)
this._applyGroupStyles();

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

#### groupOrder implementation

When `groupOrder` is set, the wrapper sorts the `TypedDataSet` rows before
forwarding to `pages-grouped-view`, so that `extractGroupBoundaries()` produces
boundaries in the specified order:

```typescript
private _reorderByGroup(
  ds: TypedDataSet,
  keyColumn: string,
  order: string[],
): TypedDataSet {
  const orderIndex = new Map(order.map((name, i) => [name, i]));
  const sorted = [...ds.rows].sort((a, b) => {
    const aName = String(a.cell(keyColumn as ColumnId).value ?? '');
    const bName = String(b.cell(keyColumn as ColumnId).value ?? '');
    const aIdx = orderIndex.get(aName) ?? order.length;
    const bIdx = orderIndex.get(bName) ?? order.length;
    return aIdx - bIdx;
  });
  return { columns: ds.columns, rows: sorted };
}
```

Groups not in the `groupOrder` array appear after all ordered groups, in their
original dataset order. Row order within each group is preserved (stable sort).

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
    emitPagesEvent(this, GroupedDataViewTopics.GROUP_TOGGLE, e.detail.payload);
  }
});
```

**row-activated:** pages-table dispatches `row-activate` as a framework-level
CustomEvent (not a `pages-event` topic) with `RowActivateDetail { row, key? }`.
Since pages-table uses `composed: true`, the event crosses shadow DOM boundaries.
The wrapper captures it and translates to a `pages-event`:

```typescript
// In connectedCallback:
this._groupedView.addEventListener('row-activate', (e: CustomEvent) => {
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
