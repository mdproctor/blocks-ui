# Design: Org Relationship Editor — Diagram Viewer Tab (#233)

## Summary

Add a third tab ("Diagram") to `<agent-relationship-editor>` that renders
`<blocks-org-diagram readonly>` from the editor's own data. Enrich table
rows with avatar thumbnails and profession badges. Wire bidirectional
interaction: clicking an agent in the diagram sets the focal agent in the
table/arc views.

## Architecture

The relationship editor composes the existing org-diagram component in
readonly mode via a new data bridge function. No new custom elements are
created.

### Data Flow

```
roster + relationships + pendingAdditions − pendingRemovals
    │
    ▼
toOrgYaml(effectiveRoster, effectiveRelationships, tenancyId)
    │
    ▼                              agents: Record<string, AgentDescriptor>
    │                                          │
    ▼                                          ▼
<blocks-org-diagram readonly .yaml=${yaml} .agents=${agents}>
```

The editor computes an effective relationships array by merging confirmed
relationships with pending additions and excluding pending removals. This
merged array is passed to `toOrgYaml` along with the roster. The diagram
renders the "what it will look like" preview; the table shows the "what's
changing" diff with green/strikethrough styling.

### New Property

`agents: Record<string, AgentDescriptor>` on the relationship editor.
Consumed by:
- **Diagram tab** — passed through to `<blocks-org-diagram>`
- **Table rows** — avatar thumbnails and profession/role badges
- **Arc view** — potential future enrichment (not in scope)

This mirrors the org-diagram's own API and keeps structural data (roster)
separate from rendering metadata (descriptors).

## Components

### 1. `toOrgYaml` Bridge Function

**Location:** `packages/graph-stencil-org/src/adapter/to-org-yaml.ts`

**Signature:**
```typescript
function toOrgYaml(
  roster: AgentRosterEntry[],
  relationships: AgentRelationship[],
  tenancyId: string,
): string
```

**Behavior:**
- Groups roster entries by `unitId` → each group becomes an `OrgUnit`
  with members
- Roster entries without `unitId` go into a synthetic "unassigned" unit
- Relationships pass through directly — they already match the YAML
  schema shape (`sourceAgentId`, `targetAgentId`, `kind`, `scope`)
- Serializes to YAML string via `yaml.stringify()`
- Re-exported from `graph-stencil-org` index

**Why in graph-stencil-org:** Sits alongside `toOrgGraph` — both are
org-domain data transformations. The relationship editor already imports
`extractEgoSubgraph` from this package.

### 2. Diagram Tab

**Location:** `components/agent-relationship-editor/src/agent-relationship-editor.ts`

**Changes:**
- Extend `ViewTab` union: `'table' | 'arc' | 'diagram'`
- Add third tab button with appropriate ARIA (`role="tab"`, `aria-selected`)
- When active, compute effective relationships, call `toOrgYaml`, render:
  ```html
  <blocks-org-diagram
    readonly
    .yaml=${this._effectiveYaml}
    .agents=${this.agents}
    .selectionTopic=${'relationship-editor:diagram:agent-selected'}
  ></blocks-org-diagram>
  ```
- Diagram shows full org structure (all agents in roster), not
  ego-subgraph scoped

**Live pending changes:** The effective YAML is recomputed reactively
whenever `relationships`, `pendingAdditions`, or `pendingRemovals` change.
The diagram re-renders with the merged state.

### 3. Bidirectional Interaction

The org-diagram emits a pages-event via `selectionTopic` when a node is
clicked. The relationship editor listens for
`relationship-editor:diagram:agent-selected` and extracts the `agentId`
from the node ID format `agent:<unitId>:<agentId>` (including the
synthetic "unassigned" unit case: `agent:unassigned:<agentId>`). Unit
node clicks (`unit:*`) are ignored.

Setting `focalAgentId` updates:
- **Table view** — re-groups relationships around the new focal agent
- **Arc view** — re-centers on the new focal agent

### 4. Richer Table Rows

When rendering relationship rows, look up the target agent in
`this.agents[agentId]`. If found, render:
- Small inline avatar (using `agent-avatar-2d` thumbnail renderer and
  the descriptor's `avatar` identity code)
- Profession and role text alongside the agent name

Graceful fallback when `agents` is not provided or a specific agent has
no descriptor — renders the agent name only, as today.

### 5. Demo Update

Replace generic agents in `demo.html` with gastown org data including
avatars and professions from #157. Exercises the full data flow:
rich roster + relationships + descriptors → table with avatars → arc
view → diagram tab.

## ARIA

- Diagram tab button: `role="tab"`, `aria-selected`, `aria-controls`
  pointing to the diagram panel
- Diagram panel: `role="tabpanel"`, `aria-labelledby` pointing to the
  tab button
- The org-diagram component already has its own internal ARIA

## Testing

### toOrgYaml (unit tests)
- Groups roster entries by unitId into units with members
- Roster entries without unitId go into synthetic unassigned unit
- Relationships pass through to YAML output
- Empty roster produces valid minimal YAML
- tenancyId propagates to units and relationships

### Diagram tab (component tests)
- ARIA: tab and tabpanel roles, aria-label, aria-selected
- Tab switching renders `<blocks-org-diagram>` with readonly attribute
- Effective YAML reflects pending additions and excludes pending removals
- Diagram click event updates focalAgentId

### Richer table rows (component tests)
- Avatar and profession rendered when agents property is set
- Graceful fallback when agents is empty or agent has no descriptor

## Constraints

- **Protocol: diagram-viewer-composition** — uses `<blocks-org-diagram
  readonly>` directly, no rendering duplication or wrapper
- **Protocol: component-customisation-pattern** — passes data via typed
  properties, not slots
- **Protocol: custom-event-namespace-prefix** — diagram selection event
  uses `relationship-editor:` namespace prefix
- **Protocol: component-registry-props** — no new `blocks-*` elements,
  so no registry update needed. Updated Props interface for the existing
  relationship editor component.

## Out of Scope

- Ego-subgraph toggle on the diagram tab
- Pending change decorations (coloured edges) in the diagram
- Arc view enrichment with avatars
- agentsEndpoint for REST-based descriptor fetching

## References

- `components/agent-relationship-editor/src/agent-relationship-editor.ts` — existing editor
- `components/agent-relationship-editor/src/types.ts` — AgentRosterEntry, AgentRelationship
- `components/org-diagram/src/blocks-org-diagram.ts` — diagram component and OrgDiagramProps
- `packages/graph-stencil-org/src/adapter/org-adapter.ts` — toOrgGraph (parallel function)
- `packages/graph-stencil-org/src/adapter/ego-subgraph.ts` — extractEgoSubgraph
- `packages/graph-stencil-org/src/types.ts` — OrgStructureYaml, RelationshipKind
- Issue #157 — rich org diagram (avatar/profession integration)
- Issue #213 — original relationship editor
- Commit 76e83e1 — relationship editor landed on main
- Protocol PP-20260903-79eda0 — diagram viewer composition
- Protocol PP-20260907-fd8ee7 — component registry props
- Protocol PP-20260930-501ce1 — custom event namespace prefix
- Protocol PP-20260713-8ea1af — component customisation pattern
