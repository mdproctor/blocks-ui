# Conversation Protocol Viewer — Design Spec

**Issue:** casehubio/blocks-ui#110
**Branch:** issue-110-conversation-protocol
**Date:** 2026-08-07

---

## Summary

Shared UI components for the `io.casehub.blocks.conversation` structured
deliberation protocol. Renders convergence state, epistemic common ground,
and conversation points — the protocol lens over structured conversations
that raw message feeds (channel-activity) and document-specific views
(document-workbench) do not provide.

**Relationship to existing components:** This is a generalization. The
conversation protocol formalizes what document-workbench's debate-feed and
review-tracker implement for document review specifically. These components
become the canonical structured deliberation UI; document-workbench adopts
them in a future issue via render callbacks.

---

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data delivery | Property-based, transport-agnostic | ConversationState is deeply nested (non-tabular). DataSourceMixin destroys non-tabular responses (GE-20260712-7250c5). Host app owns fetching. Same pattern as channel-activity and casehub-diagram. |
| Convergence visualization | Horizontal status bar | Fill = confidence (0–1), colour = state. Two dimensions in one compact visual. Embeddable in headers. Directional (unlike a radial gauge which implies single target). |
| Common ground layout | Three-column panel | Established / Pending / Disputed columns. CSS grid, responsive collapse below 500px. Visual separation by epistemic status. |
| Obligation chains | Reuse commitment-viz | Obligation chains ARE commitments in conversation context. Embed commitment-transition-badge and commitment-range-bar from commitment-viz. TransitionRecord promoted to blocks-ui-core for cross-component sharing. ObligationChain type bundles commitment state + transition history with pointId join key. Cross-component dependency follows trust-workbench precedent (which imports from split-workbench, list-pane, routing-rationale, trust-feedback-display, trust-score-panel). |
| Scope | Core components + types + point sub-sections | Five core components plus TypeScript types (conversation-viewer removed — workbench composes directly). Sub-task findings and flag indicators are in scope within point-detail. Round memo display deferred. |
| Composition | Independent panels + convenience workbench | Ship independent panels plus a blocks-conversation-workbench that composes them directly (no intermediate wrapper). Host apps can use the workbench or compose panels individually. Same pattern as trust-workbench. |
| Package structure | Single components/conversation-viewer/ | All sub-elements in one package. Shared domain types promoted to blocks-ui-core. Follows channel-activity pattern. |

### Property update semantics

ConversationState is delivered as a property. On update, the host app
creates a new ConversationState object reference (Lit's reactive
properties trigger re-render on `===` identity change). Sub-components
receive slices: `conversationState.points` to point-list,
`conversationState.commonGround` to common-ground-panel, etc. If the
host app preserves object identity for unchanged slices (e.g. only
replacing the `points` array when points change), Lit's identity check
on sub-component properties short-circuits re-rendering for unchanged
panels.

For live conversations, the expected update pattern is: host app
receives a server event, patches the relevant slice of
ConversationState, and sets the property. This is O(n) in the patch
size, not in the total state size. A conversation with 10 rounds and
100 entries is ~50KB of JSON — trivial for property diffing.

Streaming individual entries (debate-feed pattern) is inappropriate here
because ConversationState is a computed aggregate, not a raw event
stream. The protocol engine computes convergence signals, epistemic
status transitions, and point statuses — the UI renders these outputs.

---

## TypeScript Domain Types

Types live in `blocks-ui-core` for cross-component reuse. They mirror the Java
`io.casehub.blocks.conversation` package.

### Core types

```typescript
// Epistemic Status
export const EPISTEMIC_STATUSES = ['ESTABLISHED', 'PENDING', 'DISPUTED'] as const;
export type EpistemicStatus = typeof EPISTEMIC_STATUSES[number];

// Convergence
export const CONVERGENCE_STATES = [
  'PROGRESSING', 'CONVERGING', 'CONSENSUS', 'DEADLOCK', 'DIMINISHING_RETURNS',
] as const;
export type ConvergenceState = typeof CONVERGENCE_STATES[number];

export interface ConvergenceSignal {
  readonly state: ConvergenceState;
  readonly confidence: number;   // 0–1
  readonly reason: string;
}

// Common Ground
export interface GroundedFact {
  readonly id: string;
  readonly topic: string;
  readonly content: string;
  readonly epistemicStatus: EpistemicStatus;
  readonly acknowledgedBy: readonly string[];
  readonly disputedBy: readonly string[];
  readonly round: number;
}

export interface CommonGroundState {
  readonly facts: readonly GroundedFact[];
}

// Conversation Point
export interface PointClassification {
  readonly priority: string;
  readonly scope: string;
  readonly location?: string;
}

export interface ConversationEntry {
  readonly entryType: string;
  readonly content: string;
  readonly agentRole: string;
  readonly round: number;
  readonly timestamp?: string;
}

export interface ConversationPoint {
  readonly id: string;
  readonly topic: string;
  readonly round: number;
  readonly classification: PointClassification;
  readonly entries: readonly ConversationEntry[];
  readonly status: string;
  readonly convergenceSignal?: ConvergenceSignal;
}

// Supporting types
export interface SubTaskFinding {
  readonly id: string;
  readonly pointId: string;
  readonly taskType: string;        // VERIFY | ARBITRATE | CUSTOM
  readonly content: string;
  readonly status: string;
  readonly round: number;
}

export interface FlagEntry {
  readonly id: string;
  readonly pointId: string;
  readonly content: string;
  readonly flaggedBy: string;
  readonly round: number;
}

export interface RoundMemo {
  readonly agentRole: string;
  readonly content: string;
  readonly round: number;
}

// Obligation Chains (commitment integration)
// TransitionRecord promoted from commitment-viz to blocks-ui-core
export interface TransitionRecord {
  readonly from: CommitmentState;
  readonly to: CommitmentState;
  readonly actor?: string;
  readonly timestamp: string;
}

export interface ObligationChain {
  readonly pointId: string;
  readonly correlationId: string;
  readonly commitment: CommitmentRecord;
  readonly transitions: readonly TransitionRecord[];
}

// Top-level state
export interface ConversationState {
  readonly points: readonly ConversationPoint[];
  readonly convergence: ConvergenceSignal;
  readonly commonGround: CommonGroundState;
  readonly humanFlags: readonly FlagEntry[];
  readonly memos: readonly RoundMemo[];
  readonly subTaskFindings: readonly SubTaskFinding[];
  readonly obligations: readonly ObligationChain[];
  readonly currentRound: number;
}
```

### Design notes on types

- `ConversationEntry.entryType` is `string` not a union — keeps the type open
  for domain-specific extensions. Document review has entry types
  (RESTART_CONTEXT, REPRIORITISE) that the base protocol does not define.
- `ConversationPoint.status` is `string` for the same reason — rendered via
  the status registry (lookupStatus/registerStatus), not type narrowing.
  Unregistered statuses fall back to `FALLBACK_DESCRIPTOR` (`{ category:
  'neutral', icon: '?' }`) — producing a neutral left border colour and a
  '?' icon in badges. This is intentional and consistent with the status
  registry's design.
- `GroundedFact.id` added for UI list key identity.
- `CommonGroundState` uses a single `facts` array — the component partitions
  by `epistemicStatus` for the three-column layout. This eliminates the
  invariant risk of denormalized partition arrays.
- Obligation chains use `ObligationChain` (defined in ConversationState)
  which bundles `CommitmentRecord` + `TransitionRecord[]` with a `pointId`
  join key. The workbench filters by `pointId` and passes pre-filtered
  chains to point-detail — no raw commitment conversion needed at the
  component level.
- **Not mirrored:** `EpistemicRule` and `ConvergencePolicy` from the Java
  package are engine-side configuration — they govern how epistemic status
  transitions and convergence are computed, not what the UI displays. The UI
  renders the outputs (ConvergenceSignal, CommonGroundState, point statuses),
  not the policies that produce them.

---

## Component Architecture

### Package structure

```
components/conversation-viewer/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── types.ts
    ├── blocks-convergence-indicator.ts
    ├── blocks-common-ground-panel.ts
    ├── blocks-point-list.ts
    ├── blocks-point-detail.ts
    └── blocks-conversation-workbench.ts
```

### Component tree

```
blocks-conversation-workbench (split-workbench wrapper)
├── left slot:
│   ├── blocks-convergence-indicator  (sticky header)
│   └── blocks-point-list             (scrollable list)
└── right slot:
    ├── blocks-point-detail           (when point selected)
    └── blocks-common-ground-panel    (when no point selected)
```

### Property contracts

| Component | Key Properties | Events |
|-----------|---------------|--------|
| `blocks-convergence-indicator` | `signal: ConvergenceSignal`, `size: 'sm' \| 'md'` | — |
| `blocks-common-ground-panel` | `commonGround: CommonGroundState`, `factTopic?`, `renderFact?` | `${factTopic}:selected` (pages-event, default topic: `common-ground-fact`) |
| `blocks-point-list` | `points: ConversationPoint[]`, `currentRound`, `selectionTopic?`, `renderPoint?` | `${selectionTopic}:selected`, `${selectionTopic}:deselected` (pages-event) |
| `blocks-point-detail` | `point: ConversationPoint`, `findings: SubTaskFinding[]`, `flags: FlagEntry[]`, `obligations: ObligationChain[]`, `renderEntry?` | — |
| `blocks-conversation-workbench` | `conversationState: ConversationState`, `selectionTopic`, `factTopic?`, `renderPoint?`, `renderEntry?`, `renderFact?` | — |

### Extension points (per PP-20260713-8ea1af)

- `blocks-point-list`: `renderPoint?: (point: ConversationPoint) => TemplateResult | undefined`
- `blocks-point-detail`: `renderEntry?: (entry: ConversationEntry) => TemplateResult | undefined`
- `blocks-common-ground-panel`: `renderFact?: (fact: GroundedFact) => TemplateResult | undefined`

Render callbacks use inline styles (shadow DOM boundary rule per PP-20260713-8ea1af §4).

---

## Convergence Indicator

`blocks-convergence-indicator` — compact horizontal status bar.

### Colour mapping

| State | Colour | Semantic |
|-------|--------|----------|
| PROGRESSING | `--pages-neutral-8` (grey) | Neutral — ongoing, no signal yet |
| CONVERGING | `--pages-accent-9` (indigo) | Positive trend — moving toward agreement |
| CONSENSUS | `--pages-success-9` (green) | Terminal positive — agreement reached |
| DEADLOCK | `--pages-error-9` (red) | Terminal negative — irreconcilable |
| DIMINISHING_RETURNS | `--pages-warning-9` (amber) | Warning — further discussion unlikely to yield progress |

### Rendering

- Bar: `div` with `width: ${clamp(confidence) * 100}%`, `background-color` by
  state. Confidence clamped to [0, 1] with NaN fallback to 0:
  `Math.max(0, Math.min(1, confidence || 0))`.
- Track: `background: --pages-neutral-3`.
- Transition: `width 0.3s ease` for smooth confidence updates.
- Terminal states (CONSENSUS, DEADLOCK): subtle `pulseAnimation` from blocks-ui-core.
- Reason text: `title` attribute on the bar (native tooltip).

### Sizes

- `sm` — inline: bar + percentage only. For embedding in headers.
- `md` — full: state label + bar + percentage + reason tooltip.

---

## Common Ground Panel

`blocks-common-ground-panel` — three-column layout.

### Column design

The component partitions `CommonGroundState.facts` by `epistemicStatus`
into three columns (ESTABLISHED, PENDING, DISPUTED). Each column has:
- **Header:** EpistemicStatus label + count badge. Coloured header bar:
  green (`--pages-success-3`), amber (`--pages-warning-3`), red (`--pages-error-3`).
- **Fact cards:** Topic (bold, one-line truncate), content (2-line clamp,
  expandable on click), footer with round badge + acknowledgement/dispute count.

### Responsive

CSS grid `repeat(3, 1fr)`. Below 500px container width (CSS container query),
collapses to single column with coloured header dividers.

### Empty state

Columns with zero items show muted italic placeholder text. Column still
occupies grid space — no layout shift.

### Events

`common-ground-fact:selected` pages-event via `emitPagesEvent`:
`{ factId, topic, epistemicStatus }`. Extension point for host apps — e.g.
scroll point-list to the related point, highlight the fact's topic in a
linked document view, or filter a search panel. Uses pages-event (not
CustomEvent) for shadow DOM boundary crossing and consistency with the
selection events.

---

## Point List

`blocks-point-list` — scrollable list grouped by round.

### Point row contents

- Status icon via `lookupStatus('conversation', point.status)`
- `topic` as primary text
- Classification badges: priority, scope, location (same badge styling as debate-feed)
- Entry count + status label as secondary line
- Left border colour by status category

### Round grouping

Points grouped by `point.round`. Round dividers match debate-feed styling.

### Selection

Single-selection via `selectionTopic` pages-event. Selected point gets indigo
outline + accent background.

---

## Point Detail

`blocks-point-detail` — thread view for a single point.

### Sections

1. **Header:** Topic, `<status-badge domain="conversation">`, classification badges.
2. **Entry thread:** Each `ConversationEntry` as a card with left border colour
   by entry type, agent label, timestamp. `renderEntry` callback for domain
   customisation.
3. **Sub-task findings:** Collapsible. Filtered by point ID. Indented, dashed
   left border (matches debate-feed sub-task styling).
4. **Obligation chains:** Collapsible. `commitment-transition-badge` and
   `commitment-range-bar` from commitment-viz. Pre-filtered by parent — the
   workbench filters `conversationState.obligations` by
   `obligation.pointId === selectedPoint.id` and passes `ObligationChain[]`.
   Each chain's `commitment` (CommitmentRecord) feeds `commitment-range-bar`
   properties (state, createdAt, resolvedAt, acknowledgedAt, deadline);
   each entry in `transitions` (TransitionRecord[]) renders a
   `commitment-transition-badge`.
5. **Flags:** Visible only when flags exist. Warning banner styling.

### Data contract

All data passed as properties by parent. No data fetching. Parent (workbench)
filters findings, flags, and obligations by point ID.

---

## Conversation Workbench

`blocks-conversation-workbench` — convenience `split-workbench` wrapper.

Extends `KeyboardShortcutMixin(LiveRegionMixin(LitElement))` — both mixins
from `@casehubio/pages-primitives/a11y` (same pattern as session-workbench
and trust-workbench respectively).

### Layout

- Left pane: `blocks-convergence-indicator` (sticky header, size `sm`) +
  `blocks-point-list` (scrollable). Direct composition — no intermediate
  wrapper, consistent with trust-workbench's left-panel pattern.
- Right pane: swaps based on selection state
  - Point selected → `blocks-point-detail` with filtered data
  - No point selected → `blocks-common-ground-panel`

### Scroll context

The left-pane div is the scroll container (`overflow-y: auto`,
`height: 100%`). The convergence indicator uses `position: sticky; top: 0;
z-index: 1` within this container. The point-list scrolls beneath it.
The sticky element and its scroll ancestor are in the same shadow root,
avoiding the shadow DOM scroll positioning issues documented in
ARC42STORIES §6.

### Internal state and selection tracking

```typescript
@state() _selectedPointId: string | null = null;
```

**Event subscriptions** — in `connectedCallback`, subscribe via `onPagesEvent`:
- `${selectionTopic}:selected` → extract `pointId` from payload, set `_selectedPointId`
- `${selectionTopic}:deselected` → clear `_selectedPointId`

In `disconnectedCallback`, unsubscribe all.

**Data derivation** — in `willUpdate`, when `_selectedPointId` or
`conversationState` changes, derive:
1. `_selectedPoint` ← find in `conversationState.points` where `id === _selectedPointId`
2. **Stale selection guard** — if `_selectedPointId` is set but
   `_selectedPoint` is undefined (point dropped or merged in a live
   conversation), clear `_selectedPointId` to null and emit
   `${selectionTopic}:deselected` so split-workbench swaps back to list
   view. Same pattern as trust-workbench's `_resetAllState()` on
   `actorId` change.
3. `_filteredFindings` ← filter `conversationState.subTaskFindings` by `pointId`
4. `_filteredFlags` ← filter `conversationState.humanFlags` by `pointId`
5. `_filteredObligations` ← filter `conversationState.obligations` by `pointId`

Right pane renders `blocks-point-detail` with derived data when
`_selectedPointId` is set, `blocks-common-ground-panel` when null.

### Keyboard

- `Escape` deselects current point via `registerShortcut('Escape', ...)`
- Render callbacks passed through to child components

### configure() contract

```typescript
configure(props: {
  conversationState?: ConversationState;
  selectionTopic?: string;
}): void
```

Sets specified properties and calls `requestUpdate()`. Same pattern as
session-workbench and debate-feed. Used for hostPanel integration.

### Accessibility announcements (LiveRegionMixin)

- Point selected: `this.announce('Showing point: ${point.topic}')`
- Point deselected: `this.announce('Showing common ground')`
- State updated: `this.announce('Conversation updated, round ${currentRound}')`

Note: split-workbench also extends LiveRegionMixin and announces generic
"Showing detail" / "Showing list" on pane swaps. The workbench's
announcements are domain-specific supplements.

### No tabs on right pane

Detail/common-ground swap is driven by selection state, not tabs. Apps needing
tabs compose independent panels themselves.

---

## Status Registry Integration

Registrations execute at module scope (top-level side effect in the
conversation-viewer's `index.ts`), matching the existing pattern in
`blocks-ui-core/src/types/status.ts`. `REGISTRY.set()` is idempotent —
duplicate registrations from multiple entry points silently overwrite
with identical values. No collision detection needed; the `conversation`
and `epistemic` domains are owned by this package.

### Conversation point statuses

```typescript
registerStatus('conversation', 'OPEN',           { category: 'neutral',  icon: '○' });
registerStatus('conversation', 'ACTIVE',         { category: 'info',     icon: '⟳' });
registerStatus('conversation', 'AGREED',         { category: 'success',  icon: '✓' });
registerStatus('conversation', 'DISPUTED',       { category: 'danger',   icon: '✕' });
registerStatus('conversation', 'PENDING_HUMAN',  { category: 'warning',  icon: '⚑' });
registerStatus('conversation', 'DECLINED',       { category: 'success',  icon: '✓' });
registerStatus('conversation', 'VERIFIED',       { category: 'success',  icon: '✓✓' });
registerStatus('conversation', 'DEFERRED',       { category: 'neutral',  icon: '⏸' });
registerStatus('conversation', 'HUMAN_OVERRIDE', { category: 'warning',  icon: '👤' });
```

### Epistemic status

```typescript
registerStatus('epistemic', 'ESTABLISHED', { category: 'success',  icon: '●' });
registerStatus('epistemic', 'PENDING',     { category: 'warning',  icon: '◐' });
registerStatus('epistemic', 'DISPUTED',    { category: 'danger',   icon: '○' });
```

---

## Event Coordination

Default `selectionTopic` is `conversation-point`. Events follow the platform
convention of colon-delimited topic hierarchies (ARC42STORIES §8).

| Event | Mechanism | Source | Payload | Consumer |
|-------|-----------|--------|---------|----------|
| `${selectionTopic}:selected` | pages-event via `emitPagesEvent` | point-list | `{ pointId, round, location }` | split-workbench (right pane → detail) |
| `${selectionTopic}:deselected` | pages-event via `emitPagesEvent` | point-list | `{ pointId }` | split-workbench (right pane → common ground) |
| `${factTopic}:selected` | pages-event via `emitPagesEvent` | common-ground-panel | `{ factId, topic, epistemicStatus }` | host app (optional coordination). Default `factTopic`: `common-ground-fact` |

---

## Document-Workbench Generalization Path (#117)

Not in scope for this implementation. Tracked as casehubio/blocks-ui#117.
The path:

1. `debate-feed` → wraps `blocks-point-list` with `renderPoint` callback for
   document-review-specific entry type rendering.
2. `review-tracker` → replaced by `blocks-point-list` + `blocks-point-detail`
   with domain-specific render callbacks. `_derivePoints()` moves to host app
   as a mapping from `DebateStreamEntry[]` to `ConversationPoint[]`.
3. Types: `DebateStreamEntry` maps to `ConversationEntry`, `DerivedPoint` maps
   to `ConversationPoint`.

---

## Showcase

Examples page at `examples/conversation-viewer.html` with mock data:
- 3 rounds, 5 points across different statuses
- Convergence: PROGRESSING → CONVERGING at 0.72 confidence
- Common ground with facts in all three epistemic columns
- One point with sub-task findings and a flag
- Two obligation chains with transition history

---

## Garden Entries Consulted

| ID | Relevance |
|----|-----------|
| GE-20260712-7250c5 | DataSourceMixin destroys non-tabular responses — drove property-based data delivery decision |
| GE-20260806-10d369 | EventStreamController is WebSocket-based — informs future SSE integration |
| GE-20260806-1f881e | SSEManager eventNames filters protocol-level names — informs future event filtering |
| GE-20260804-befd45 | Composition via primitives technique — informed component decomposition |
| GE-20260804-24d409 | Custom element tag mismatch gotcha — all tags use blocks- prefix |
| GE-20260605-73c9d6 | CommitmentState.DECLINED gotcha — obligation chain rendering uses correct state |

---

## Protocols Applied

| ID | Rule |
|----|------|
| PP-20260713-8ea1af | Typed config + render callbacks for customisation (not slots) |
| PP-20260806-320d50 | Stencil package isolation (no cross-imports) — not directly applicable but informs package boundary thinking |
