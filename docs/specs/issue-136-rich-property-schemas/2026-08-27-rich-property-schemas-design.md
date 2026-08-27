# Rich Domain Property Schemas for All Diagram Types

**Date:** 2026-08-27 (revised after light design review)
**Issue:** casehubio/blocks-ui#136
**Status:** Approved

## Summary

Define per-stencil JSON Schema descriptors in each stencil package that
drive pages-property-palette (pages#373). Migrate all property editing —
including discriminated unions (worker function types, binding targets,
triggers) — to schema-driven rendering via `x-discriminator` and
`x-display-hint` with registered custom editors. Extend pages#373's
schema extension vocabulary to support this.

## Architecture

### Schema Extensions (extending pages#373)

pages#373 defines: `x-group`, `x-order`, `x-visibility`, `x-display-hint`,
`x-placeholder`, `x-help`. This spec adds two extensions that must be
proposed upstream to pages#373:

```typescript
'x-discriminator'?: string;     // field name that selects the active oneOf branch
'x-editor-component'?: string;  // custom element tag name for rendering this field
```

**`x-discriminator`:** On a `oneOf` schema, names the field whose value
selects which branch is active. The palette renders a type selector
(dropdown or radio group) for this field and swaps the visible sub-schema
when it changes. Standard JSON Schema `oneOf` with a structural hint for
the palette — not a proprietary extension.

**`x-editor-component`:** Names a registered custom element that renders
this field instead of the default editor. The element receives `value`
and emits `value-changed`. This replaces `x-display-hint` for cases
where a built-in hint isn't sufficient — the component IS the hint.

Examples:
- `"x-editor-component": "blocks-prompt-editor"` — textarea with pop-out dialog
- `"x-editor-component": "blocks-env-map-editor"` — KEY=VALUE per-line editor
- `"x-editor-component": "blocks-sequence-editor"` — drag-reorder worker list

### Discriminated Union onChange Routing

When a discriminator field changes (e.g. function type switches from
`agent` to `mcp`), the palette's generic `onChange(field, value)` fires.
The diagram component's `_handlePropertyChange` must detect discriminator
changes and route them to the specialised YAML editors:

```typescript
_handlePropertyChange(e: CustomEvent<{ field: (string|number)[], value: unknown }>) {
  const { field, value } = e.detail;
  const fieldName = field[field.length - 1];

  // Discriminator field → specialised CST editor
  if (fieldName === 'functionType') return switchFunctionType(yaml, path, value as WorkerFunctionType);
  if (fieldName === 'transportType') return switchMcpTransport(yaml, path, value as McpTransportType);
  if (fieldName === 'modelProvider') return switchModelProvider(yaml, path, value as ModelProviderKey);
  if (fieldName === 'targetType') return switchBindingTarget(yaml, path, value as string);

  // Regular field → generic CST editor
  return applyPropertyEdit(yaml, path, field, value);
}
```

The existing `switchFunctionType`, `switchMcpTransport`, `switchModelProvider`,
`switchBindingTarget` CST-preserving YAML editors are unchanged — they
handle the atomic key-swap on the YAML document. The schema tells the
palette WHAT to render; the YAML editor handles HOW to apply the change.

### Schema Registry

Replaces the existing `_schemaTypeMap()` + `schema` property on
`DiagramBaseMixin`. A simple `Map<string, JSONSchema>` in diagram-core:

```typescript
// diagram-core/src/schema-registry.ts
const schemas = new Map<string, JSONSchema>();

export function registerPropertySchema(nodeType: string, schema: JSONSchema): void {
  schemas.set(nodeType, schema);
}

export function getPropertySchema(nodeType: string): JSONSchema | undefined {
  return schemas.get(nodeType);
}
```

**Migration from `_schemaTypeMap()`:**

1. Remove `abstract _schemaTypeMap(): Record<string, string>` from `DiagramBaseMixin`
2. Remove `schema: Record<string, unknown>` property from `DiagramBaseMixin`
3. Update `_updateSelectedNode()` to use `getPropertySchema(node.type)` instead of `this.schema.$defs[defKey]`
4. `swf-diagram`: remove `schema = swfTaskSchema` and `SWF_SCHEMA_TYPE_MAP` — schemas registered via `registerSwfStencils()`
5. `casehub-diagram`: remove `SCHEMA_TYPE_MAP` — schemas registered via `registerCaseStencils()`
6. `diagram-properties` component: receives schema directly from the diagram component, unchanged

### Registration Pattern

Each stencil package's `register*Stencils()` function registers both
visual stencils AND property schemas:

```typescript
export function registerCaseStencils(): void {
  // existing visual stencil registration ...
  registerPropertySchema('binding', bindingSchema);
  registerPropertySchema('worker', workerSchema);
  registerPropertySchema('milestone', milestoneSchema);
  registerPropertySchema('goal', goalSchema);
  registerPropertySchema('subcase', subcaseSchema);
}
```

Schemas are also exported individually from each package's `schemas/index.ts`.

## Per-Package Schemas

### graph-stencil-case (`src/schemas/`)

#### binding-schema.ts

| Group | Field | Type | Notes |
|-------|-------|------|-------|
| Identity | `name` | string, optional | |
| Configuration | `capability` | string, optional | Capability name ref |
| Target | `humanTask` | object, optional | titleExpression, candidateGroups, candidateUsers, dueDate |
| Target | `subCase` | object, optional | See subcase-schema fields |
| Behaviour | `on` | oneOf with x-discriminator on trigger type | contextChange (filter), cloudEvent, schedule, scopeActivated |
| Behaviour | `when` | string, optional | JQ filter |
| Advanced | `conflictResolverStrategy` | enum: LAST_WRITER_WINS / FIRST_WRITER_WINS / FAIL / DEEP_MERGE | |
| Advanced | `outcomePolicy` | object, optional | onDecline, onFailure, onExpired, maxRerouteAttempts |
| Advanced | `inputProjectionOverride` | string, optional | JQ expression |
| Advanced | `contextWrite` | object, optional | x-editor-component: blocks-json-editor |
| Advanced | `producedKeys` | string[], optional | Tag input |
| Advanced | `lifecycleScope` | enum: BINDING / COMPOUND / CASE | |
| Advanced | `participation` | enum: PARTICIPANT / COMPANION | |
| Advanced | `executionMode` | enum: TRANSIENT / PERSISTENT / REINVOKED | |

The binding target is NOT a discriminated union in the schema — `capability`,
`humanTask`, and `subCase` are independent optional fields on the Binding type.
The existing `switchBindingTarget` handles mutual exclusion at the YAML level.

#### worker-schema.ts

| Group | Field | Type | Notes |
|-------|-------|------|-------|
| Identity | `name` | string, required | WorkerName |
| Identity | `description` | string, optional | |
| Configuration | `capabilities` | string[] (min 1), required | Tag input |
| Function | function type | oneOf with x-discriminator | See sub-schemas below |
| Advanced | `executionPolicy` | object, optional | timeout, retries |
| Advanced | `contextType` | string, optional | |
| Advanced | `outputType` | string, optional | |

**Function type sub-schemas (7 types):**

| Type | Key | Fields |
|------|-----|--------|
| `agent` | `agent:` | `systemPrompt` (string, x-editor-component: blocks-prompt-editor), `inputProjection` (string), `outputProjection` (string), `userMessageTemplate` (string, optional), `model` (oneOf with x-discriminator on provider key — see below) |
| `flow` | `do:` | SWF workflow block (readonly, x-editor-component: blocks-swf-link — renders "Edit via SWF drill-down") |
| `a2a` | `a2a:` | `endpoint` (string, format: uri), `skill` (string, optional), `streaming` (boolean, optional), `auth` (AuthConfig, optional) |
| `mcp` | `mcp:` | oneOf with x-discriminator on transport type: `stdio` ({command: string[], env: Record<string,string> via x-editor-component: blocks-env-map-editor}) or `http` ({url: string, format: uri, auth: AuthConfig optional}) |
| `sequence` | `sequence:` | string[] (x-editor-component: blocks-sequence-editor — drag-reorder with filtered dropdown) |
| `external` | (none) | No fields — empty sub-schema |
| `unknown` | (unrecognised) | No fields — empty sub-schema |

**Agent model sub-schema:** oneOf with x-discriminator on ModelProviderKey
(`openai` / `anthropic` / `ollama` / `mistralAi` / `googleAiGemini`).
Each provider branch has: `modelName` (string, required), `apiKey`
(string, optional), `temperature` (number, optional, 0-2), `maxTokens`
(integer, optional), `topP` (number, optional, 0-1).

**AuthConfig sub-schema:** `type` (enum: none / bearer / api-key),
`tokenConfigKey` (string, optional — visible when type != none).

#### milestone-schema.ts

| Group | Field | Type | Notes |
|-------|-------|------|-------|
| Identity | `name` | string, required | |
| Identity | `description` | string, optional | |
| Behaviour | `condition` | string, required | JQ expression, textarea |
| Behaviour | `entryCriteria` | string, optional | |
| Advanced | `slaDuration` | string, optional | ISO 8601 duration |
| Advanced | `slaStartFrom` | enum: CASE_CREATED / MILESTONE_ACTIVATED / PREVIOUS_MILESTONE_COMPLETED / EVENT_OCCURRED | |

#### goal-schema.ts

| Group | Field | Type | Notes |
|-------|-------|------|-------|
| Identity | `name` | string, required | |
| Identity | `description` | string, optional | |
| Behaviour | `condition` | string, required | JQ expression |
| Behaviour | `kind` | string, optional | |

#### subcase-schema.ts

| Group | Field | Type | Notes |
|-------|-------|------|-------|
| Identity | `namespace` | string, required | |
| Identity | `name` | string, required | |
| Configuration | `version` | string, required | |
| Configuration | `completionStrategy` | enum: DEFAULT / CUSTOM, optional | |
| Configuration | `waitForCompletion` | boolean, optional | |
| Advanced | `inputMapping` | string, optional | JQ expression |
| Advanced | `outputMapping` | string, optional | JQ expression |
| Advanced | `maxRecursionDepth` | number, optional | |
| Advanced | `groupId` | string, optional | M-of-N grouping |
| Advanced | `totalInGroup` | number, optional | |
| Advanced | `requiredCount` | number, optional | |
| Advanced | `onThresholdReached` | enum: KEEP / CANCEL, optional | |

### graph-stencil-swf (`src/schemas/`)

Existing `swfTaskSchema` extended with `x-group`, `x-order`, `x-visibility`
annotations. The file moves from `src/schema/swf-task-schema.ts` to
`src/schemas/swf-task-schema.ts` (consistent directory naming). Update
imports in `swf-diagram.ts` and `index.ts`.

### graph-stencil-htn (`src/schemas/`)

#### dag-node-schema.ts

Based on `DagNodeSnapshot`:

| Group | Field | Type | Notes |
|-------|-------|------|-------|
| Identity | `id` | string, readonly | |
| Identity | `taskId` | string, readonly | |
| Identity | `taskDescription` | string, optional | |
| Configuration | `executorName` | string, optional | |
| Configuration | `joinType` | enum: ALL_OF / ANY_OF | |
| Configuration | `dependsOn` | readonly string[], readonly | Display only |

All HTN fields are readonly in runtime context — DAG nodes represent
execution snapshots, not editable definitions. The schema serves the
palette for display purposes. Editable properties belong on
`PlanItemDefinition` (see below).

#### plan-item-schema.ts

Based on `PrimitivePlanItem` and `CompoundPlanItem`:

**Primitive plan items:**

| Group | Field | Type | Notes |
|-------|-------|------|-------|
| Identity | `name` | string, required | |
| Configuration | `executor.name` | string, required | Nested object |
| Configuration | `executor.description` | string, optional | |
| Behaviour | `entryCondition` | string, optional | |

**Compound plan items:**

| Group | Field | Type | Notes |
|-------|-------|------|-------|
| Identity | `name` | string, required | |
| Configuration | `completion` | CompletionSemantics | All / M-of-N / FirstWins |
| Configuration | `dispatchMode` | enum: ORCHESTRATED / CHOREOGRAPHED | |
| Configuration | `repeatable` | boolean | |
| Behaviour | `entryCondition` | string, optional | |
| Behaviour | `exitCondition` | string, optional | |
| Advanced | `planningStrategy` | string, optional | |
| Advanced | `scopedBindings` | object, optional | x-editor-component: blocks-json-editor |

## Grouping Convention

| Group | x-order | Purpose |
|-------|---------|---------|
| Identity | 0 | name, type, description — always first |
| Configuration | 10 | capabilities, endpoints, type-specific config |
| Target | 15 | binding target fields (case-specific) |
| Function | 18 | worker function type selector + sub-schema (case-specific) |
| Behaviour | 20 | conditions, expressions, triggers |
| Status | 25 | readonly runtime state (HTN-specific) |
| Advanced | 30 | timeouts, retry, auth, mapping — `x-visibility: advanced` |

## Custom Editor Components

Registered as custom elements. The palette creates them via
`document.createElement(tagName)` and sets `.value` / listens for
`value-changed`. Each is a self-contained Lit element in diagram-core
or the relevant stencil package.

| Component | Package | Purpose |
|-----------|---------|---------|
| `blocks-prompt-editor` | diagram-core | Textarea with pop-out dialog via `showModal()` |
| `blocks-env-map-editor` | graph-stencil-case | KEY=VALUE per-line ↔ `Record<string,string>` |
| `blocks-sequence-editor` | graph-stencil-case | Drag-reorder worker name list with filtered dropdown |
| `blocks-swf-link` | graph-stencil-case | Read-only "Edit via SWF drill-down (⤢)" link |
| `blocks-json-editor` | diagram-core | Read-only JSON display for opaque objects |

## Migration Plan

### Phase 1: Schema registry + simple schemas

1. Add `schema-registry.ts` to diagram-core (register/get)
2. Write milestone, goal schemas (simplest — no discriminated unions)
3. Register in `registerCaseStencils()`
4. Wire `_updateSelectedNode()` to use registry
5. Remove `_schemaTypeMap()` abstract method from `DiagramBaseMixin`
6. Update `swf-diagram` and `casehub-diagram` to drop schema/typeMap properties

### Phase 2: Discriminated union schemas

1. Propose `x-discriminator` and `x-editor-component` to pages#373
2. Write binding schema with trigger oneOf
3. Write worker schema with function type oneOf (all 7 types)
4. Implement custom editor components (prompt-editor, env-map, sequence-editor)

### Phase 3: HTN schemas + cleanup

1. Write dag-node and plan-item schemas
2. Register in `registerHtnStencils()` (new registration function)
3. Remove diagram-core `form/` utilities (field-renderer, validation, trigger-editor, nested-group, property-form) — superseded by pages-property-palette
4. Remove `casehub-diagram-properties` component — replaced by `pages-property-palette`

## What This Does NOT Cover

- **pages-property-palette implementation** — pages#373
- **`x-discriminator` palette rendering** — proposed as an extension to pages#373
- **Runtime-only displays** — HTN dag-node schemas are for display, not editing

## Testing

### Per-Schema Unit Tests

- Schema validates as valid JSON Schema (via ajv)
- All `x-group` and `x-order` annotations present on every property
- Discriminator fields exist in oneOf schemas
- Sample data from actual YAML validates (positive)
- Malformed data rejects (negative)

### Registry Tests

- `registerCaseStencils()` registers all expected node types
- `getPropertySchema(type)` returns correct schema
- Unknown types return `undefined`

### Migration Regression Tests

- Existing SWF property editing continues to work after registry migration
- `_handlePropertyChange` routes discriminator fields to specialised editors
- Custom editor components render and emit `value-changed`

## File Structure

```
packages/diagram-core/src/
├── schema-registry.ts              ← NEW
├── schema-registry.test.ts         ← NEW
├── editors/
│   ├── blocks-prompt-editor.ts     ← NEW
│   ├── blocks-json-editor.ts       ← NEW
│   └── index.ts
├── form/                           ← REMOVED in Phase 3
├── index.ts                        ← updated

packages/graph-stencil-case/src/
├── schemas/
│   ├── binding-schema.ts           ← NEW
│   ├── worker-schema.ts            ← NEW
│   ├── milestone-schema.ts         ← NEW
│   ├── goal-schema.ts              ← NEW
│   ├── subcase-schema.ts           ← NEW
│   ├── index.ts                    ← NEW
│   └── schemas.test.ts             ← NEW
├── editors/
│   ├── blocks-env-map-editor.ts    ← NEW
│   ├── blocks-sequence-editor.ts   ← NEW
│   ├── blocks-swf-link.ts          ← NEW
│   └── index.ts
├── worker-function/                ← REMOVED in Phase 3 (renderers only; types.ts stays)
├── index.ts                        ← updated

packages/graph-stencil-swf/src/
├── schemas/
│   ├── swf-task-schema.ts          ← MOVED from src/schema/, extended
│   └── schemas.test.ts             ← NEW
├── index.ts                        ← updated

packages/graph-stencil-htn/src/
├── schemas/
│   ├── dag-node-schema.ts          ← NEW
│   ├── plan-item-schema.ts         ← NEW
│   ├── index.ts                    ← NEW
│   └── schemas.test.ts             ← NEW
├── index.ts                        ← updated
```

## References

- casehubio/casehub-pages#373 — pages-property-palette spec (PropertyPaletteSource SPI)
- packages/graph-stencil-case/src/types/generated/case-definition.ts — Binding, Worker, Milestone, Goal, SubCase types
- packages/graph-stencil-case/src/worker-function/types.ts — WorkerFunctionType (7 types), AgentConfig, McpConfig, AuthConfig, ModelProviderKey
- packages/graph-stencil-htn/src/types/dag-plan.ts — DagNodeSnapshot, DagPlanSnapshot
- packages/graph-stencil-htn/src/types/plan-item.ts — PrimitivePlanItem, CompoundPlanItem, CompletionSemantics
- packages/graph-stencil-htn/src/types/task-node.ts — TaskNodeSnapshot, DecompositionMethodSnapshot
- packages/diagram-core/src/diagram-base-mixin.ts — _schemaTypeMap(), schema property, _updateSelectedNode()
- packages/diagram-core/src/form/ — existing form utilities (to be removed)
- packages/graph-stencil-swf/src/schema/swf-task-schema.ts — existing SWF JSON Schema
- docs/specs/issue-108-worker-function-drill-down/2026-08-11-worker-function-drill-down-design.md — prior decision on schema-drivability (superseded by this spec)
- docs/protocols/blocks-ui/stencil-package-isolation.md — stencil packages stay siloed
- Design review R1-01 through R1-15 — findings that drove this revision
- casehubio/blocks-ui#136
