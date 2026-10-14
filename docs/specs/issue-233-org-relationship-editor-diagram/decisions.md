# Decisions — #233 Org Relationship Editor Diagram Tab

## D1: Agent descriptor data delivery

**Choice:** New `agents: Record<string, AgentDescriptor>` property on the relationship editor
**Alternatives:**
- Extend AgentRosterEntry — simpler single-list API but bloats structural type with rendering concerns
- agentsEndpoint property — more autonomous but adds fetch complexity to a pure property-driven component
**Rationale:** Mirrors the org-diagram's own API. Keeps structural data (roster) separate from rendering metadata (descriptors). Both the diagram tab and the richer table rows consume the same property.
**Trade-offs:** Consumer must pass two data sources (roster + agents) instead of one enriched list
**Sources:** components/agent-relationship-editor/src/types.ts, components/org-diagram/src/blocks-org-diagram.ts
**Exploration:** quick
**Status:** captured

## D2: Diagram scope

**Choice:** Full org structure (all agents in roster)
**Alternatives:**
- Ego-subgraph only — focused but hides relationships the user might edit
- Both with toggle — flexible but adds UI complexity
**Rationale:** The relationship editor is editing the whole org structure, so the diagram should reflect the complete picture. Users can orient from the full view.
**Trade-offs:** Large orgs may render a busy diagram; no focal-agent scoping
**Sources:** packages/graph-stencil-org/src/adapter/ego-subgraph.ts
**Exploration:** quick
**Status:** captured

## D3: Live pending changes

**Choice:** Diagram re-renders live as the user adds/removes relationships, including pending changes
**Alternatives:**
- Confirmed only — simpler data flow but switching to diagram tab mid-edit shows stale state
**Rationale:** Immediate visual feedback of what the edit will look like. The diagram is a preview, the table is the diff.
**Trade-offs:** More frequent re-renders; YAML rebuild on every pending change
**Sources:** components/agent-relationship-editor/src/agent-relationship-editor.ts (pending state management)
**Exploration:** quick
**Status:** captured

## D4: Click-to-focus bidirectional interaction

**Choice:** Clicking an agent node in the diagram sets it as the focalAgentId
**Alternatives:**
- Scroll to agent — less disruptive but less useful
- No interaction — simplest but misses bidirectional value
**Rationale:** Natural flow: "I see this agent in the diagram, let me edit their relationships." Updates table grouping perspective and arc view center.
**Trade-offs:** Switching focal agent may be disorienting if the user doesn't expect it
**Sources:** components/org-diagram/src/blocks-org-diagram.ts (selectionTopic property)
**Exploration:** quick
**Status:** captured

## D5: Bridge function location and signature

**Choice:** `toOrgYaml(roster, relationships, tenancyId)` in graph-stencil-org adapter package
**Alternatives:**
- In the relationship editor component — simpler imports but buries domain logic in UI
- In blocks-ui-core — types/utilities package, not adapters
**Rationale:** Sits alongside toOrgGraph — both are org-domain data transformations. Clean domain boundary.
**Trade-offs:** Relationship editor imports from stencil package (already does for ego-subgraph)
**Sources:** packages/graph-stencil-org/src/adapter/org-adapter.ts (toOrgGraph)
**Exploration:** quick
**Status:** captured

## D6: Pending changes data flow

**Choice:** Editor merges confirmed + pending additions − pending removals into effective relationships array, passes to toOrgYaml. Diagram renders merged state without special pending decoration.
**Alternatives:**
- Pass pending state to diagram with decoration for pending edges — richer feedback but significant complexity in org stencil
**Rationale:** The diagram shows "what it will look like" preview. The table shows "what's changing" diff. Each view has a clear role.
**Trade-offs:** No visual distinction between committed and pending relationships in the diagram
**Sources:** components/agent-relationship-editor/src/agent-relationship-editor.ts (pendingAdditions/pendingRemovals)
**Exploration:** quick
**Status:** captured

## D7: Richer table rows in scope

**Choice:** In scope — table rows show avatar thumbnails, profession/role alongside agent names
**Alternatives:**
- Defer to follow-up — smaller scope but loses synergy with new agents property
**Rationale:** The agents property is already being added for the diagram tab. Table rows can consume it with small incremental cost for significant UX improvement.
**Trade-offs:** Slightly larger issue scope
**Sources:** Issue #233 description
**Exploration:** quick
**Status:** captured
