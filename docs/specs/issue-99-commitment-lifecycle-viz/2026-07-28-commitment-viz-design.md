# Commitment Lifecycle Visualization — Design Spec

**Issue:** casehubio/blocks-ui#99 (primary), #24 (batched)
**Branch:** issue-99-commitment-lifecycle-viz
**Date:** 2026-07-28

## Problem

Qhorus commitments have a full state machine (OPEN → ACKNOWLEDGED → FULFILLED / FAILED / DECLINED / DELEGATED / EXPIRED) but the visual rendering is scattered and incomplete:

- `channel-message` renders a small inline badge on COMMAND messages — hardcoded CSS, not reusable.
- `channel-task-panel` has a parallel copy of the same badge CSS with different class names.
- `blocks-timeline` has a `commitmentLifecycleStrategy` with a simplified 4-stage model (COMMANDED → ACKNOWLEDGED → DONE → DECLINED) that diverges from the qhorus domain model.
- No visual for state transitions (from → to), no timeline range highlighting for commitment spans in the feed.

## Decisions

- **Standalone package:** New `components/commitment-viz/` package, decoupled from channel-activity. Any blocks-ui surface (channel-feed, case-explorer, work-item-detail) can import individual components.
- **Qhorus 7-state model is source of truth:** OPEN, ACKNOWLEDGED, FULFILLED, FAILED, DECLINED, DELEGATED, EXPIRED. The timeline strategy's 4-stage view is a rendering simplification that derives from this model — not a parallel ontology.
- **Type promotion to blocks-ui-core:** `CommitmentState`, `COMMITMENT_STATES`, `commitmentStateCategory`, `StateCategory`, `CommitmentRecord` (extended with `resolvedAt`), `RawCommitment`, `toCommitmentRecord`, and `toCommitmentMap` move from `channel-activity` to `packages/blocks-ui-core/src/types/commitment.ts`. Core already hosts domain-adjacent types (work-item, trust, identity). Both `channel-activity` and `commitment-viz` import from core — no inter-component dependency. Required by ARC42STORIES §2: "Components depend on `casehub-pages` packages but never on each other (except through `blocks-ui-core`)."
- **Commitment map keyed by correlationId:** The canonical convention is `Map<string, CommitmentRecord>` keyed by `correlationId`, consistent with `toCommitmentMap()` and the range-decorator. The existing task panel's lookup by `msg.id` is a pre-existing inconsistency to fix during pill/badge adoption.
- **Feed decoration via pure function:** A `decorateCommitmentRanges()` function returns decoration metadata. The feed keeps rendering control — no coupling to feed internals. The decorator function and its tests are deliverables on this branch; feed integration (modifying `channel-feed`) is a future adoption step.
- **Range bar has dual mode:** Compact (inline/table) and detailed (panel) via a `mode` property. One component, two presentations.
- **Component-per-concern:** Four focused units (pill, transition badge, range bar, decorator function) rather than a monolithic component. Each independently importable and testable.

## Package Structure

```
components/commitment-viz/
  src/
    index.ts
    types.ts
    colors.ts
    commitment-state-pill.ts
    commitment-state-pill.test.ts
    commitment-transition-badge.ts
    commitment-transition-badge.test.ts
    commitment-range-bar.ts
    commitment-range-bar.test.ts
    range-decorator.ts
    range-decorator.test.ts
  package.json
  tsconfig.json
  vite.config.ts
```

## Type Promotion to blocks-ui-core

This branch adds `packages/blocks-ui-core/src/types/commitment.ts` containing types and functions previously local to `channel-activity`:

- `CommitmentState` (string union), `COMMITMENT_STATES` (array)
- `StateCategory` — named type for the `commitmentStateCategory` return value (previously an inline union)
- `commitmentStateCategory(state: CommitmentState): StateCategory`
- `isTerminalCommitmentState(state: CommitmentState): boolean` — returns true for `{FULFILLED, FAILED, DECLINED, DELEGATED, EXPIRED}`. Eliminates duplicated hardcoded lists in `channel-task-panel._isTerminal()` and the range-decorator. Follows the same pattern as `isTerminalMessageType()` for message types.
- `RawCommitment`, `CommitmentRecord`, `toCommitmentRecord`, `toCommitmentMap`

`CommitmentRecord` is extended with `resolvedAt?: string` — preserved from `RawCommitment` through `toCommitmentRecord()`, rather than being folded into `updatedAt`. This gives consumers (including `commitment-range-bar`) access to the actual resolution timestamp.

`channel-activity` re-exports these from core (no API change for existing consumers). `commitment-viz` imports directly from core. Core's `types/index.ts` gains a `commitment.js` re-export.

**Naming collision fix:** `blocks-timeline`'s `CommitmentState` interface in `commitment-lifecycle.ts` is renamed to `CommitmentLifecycleData` to eliminate the naming collision with the canonical string union now in core. The strategy's 4-stage model (COMMANDED → ACKNOWLEDGED → DONE → DECLINED) is unchanged — the rename affects only the data input interface, not the stage definitions.

## Type Foundation

### types.ts

```typescript
import type { CommitmentState, CommitmentRecord, StateCategory } from '@casehubio/blocks-ui-core';

export type { CommitmentState, CommitmentRecord, StateCategory };

export interface DecorableMessage {
  readonly id: string;
  readonly correlationId?: string;
}

export interface TransitionRecord {
  readonly from: CommitmentState;
  readonly to: CommitmentState;
  readonly actor?: string;
  readonly timestamp: string;
}

export interface RangeDecoration {
  readonly correlationId: string;
  readonly state: CommitmentState;
  readonly category: StateCategory;
  readonly startMessageId: string;
  readonly endMessageId?: string;
  readonly messageIds: readonly string[];
}
```

`DecorableMessage` is the minimal contract the range-decorator needs from messages — just `id` and `correlationId`. `QhorusMessage` satisfies this structurally, so callers pass `QhorusMessage[]` with no cast or adapter. This keeps `commitment-viz` decoupled from `channel-activity`.

`RangeDecoration.correlationId` is the commitment map key (per §Decisions), not the commitment entity's UUID. `endMessageId` is undefined for open commitments (span extends to present) and set to the last message with the correlationId for terminal commitments.

### colors.ts

Extracts the state → CSS colour mapping currently duplicated in `channel-message` and `channel-task-panel`. Uses `--pages-*` CSS custom properties. Exports:

- `stateCategory` — re-exports `commitmentStateCategory` from `@casehubio/blocks-ui-core` (no reimplementation).
- `stateCategoryStyles(category: StateCategory): StyleInfo` — returns a Lit `styleMap`-compatible object with `background` and `color` properties using `--pages-*` tokens. Used by pill, badge, and range-bar internally, and available to consumers who need inline styles for render callbacks (per protocol PP-20260713-8ea1af).

## Components

### commitment-state-pill

**Element:** `<commitment-state-pill>`

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `state` | `CommitmentState` | required | State to display |
| `size` | `'sm' \| 'md'` | `'sm'` | Small for inline, medium for panels |
| `showIcon` | `boolean` | `false` | Prepend status icon |

Renders a rounded-pill `<span>` with background/text colour from `colors.ts`. Label is the state name in uppercase. Same visual language as the existing `speech-act-badge` pattern in channel-message.

**Replaces (after adoption):** Once adopted by `channel-message` and `channel-task-panel`, both components replace inline badge markup with this element and delete their duplicated `.commitment-badge` / `.badge-*` CSS. Adoption is a separate future step — not part of this branch.

### commitment-transition-badge

**Element:** `<commitment-transition-badge>`

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `transition` | `TransitionRecord` | required | Transition to render |
| `compact` | `boolean` | `false` | Omit actor/timestamp |

**Full mode:** `[OPEN] → [ACKNOWLEDGED]  agent-alice · 2m ago`

**Compact mode:** `[OPEN] → [ACKNOWLEDGED]`

Composes `<commitment-state-pill>` for each state label — does not reimplement pill rendering. Arrow is a plain `→` text character.

Transition detection is the consumer's job. This component is a stateless renderer — it receives a `TransitionRecord` and renders it.

### commitment-range-bar

**Element:** `<commitment-range-bar>`

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `state` | `CommitmentState` | required | Current state |
| `createdAt` | `string` | required | ISO timestamp, range start |
| `resolvedAt` | `string \| undefined` | `undefined` | Range end (undefined = open) |
| `acknowledgedAt` | `string \| undefined` | `undefined` | Ack milestone |
| `deadline` | `string \| undefined` | `undefined` | SLA deadline marker |
| `mode` | `'compact' \| 'detailed'` | `'compact'` | Visual treatment |

**Compact mode:** Thin horizontal bar (4px) coloured by state category with a `title` attribute displaying the state name for screen-reader and tooltip access (colour is not the sole information carrier). Open commitments pulse at the right edge (reuses `pulseAnimation` from blocks-ui-core). Deadline shown as a tick mark at proportional position. Overdue (past deadline, still open) pulses in danger colour.

**Detailed mode:** Wider strip (~32px) with milestone markers along a time axis:

```
●─────────────●─────────────●
Created    Acknowledged    Fulfilled
08:00         08:15          14:00
```

Milestones are small dots coloured by status (completed/active/pending). Connecting line coloured up to current state. Active rightmost segment pulses.

Does NOT reuse blocks-timeline — lighter weight, no strategy system, no DataSourceMixin, no pagination. Renders directly from properties. For full strategy-based timeline view, consumers use `<blocks-timeline>` with `commitmentLifecycleStrategy()`.

**Relationship to sla-indicator:** Complementary. Range bar shows spatial position of deadline within the commitment lifespan. SLA indicator shows temporal countdown and breach state. Consumers can show both.

### range-decorator (pure function)

```typescript
export function decorateCommitmentRanges(
  messages: readonly DecorableMessage[],
  commitments: ReadonlyMap<string, CommitmentRecord>,
): RangeDecoration[]
```

**Logic:**

1. Walk messages in order. For each message with a `correlationId`, look up commitment in the map.
2. Group messages by `correlationId` — all messages sharing a correlation ID belong to the same commitment span.
3. Span starts at the first message with that correlationId. For terminal commitments (`isTerminalCommitmentState(record.state)`), span ends at the last message with that correlationId — `endMessageId` is set. For open commitments, `endMessageId` is undefined — the span extends to the present.
4. Return a `RangeDecoration` per commitment with correlationId, state, category, start/end message IDs, and full list of member message IDs.

**Scope:** The decorator function and its tests are deliverables on this branch. The feed integration pattern below is a reference guide for future adoption — `channel-feed` is not modified on this branch.

**Feed integration pattern (future adoption):** Feed calls `decorateCommitmentRanges(this.messages, this.commitments)` during render, builds a `Set<string>` of decorated message IDs, applies CSS classes in `_messageItemClasses()`. Feed decides the visual treatment (left border, background tint). Adoption requires fixing the feed's `commitments` property type from `Map<string, CommitmentState>` to `Map<string, CommitmentRecord>` and wiring the decorator call into render.

**Edge cases:**
- Multiple overlapping commitments — each gets its own `RangeDecoration`. Feed decides how to render overlaps.
- Messages with no correlationId — ignored.
- Commitment not found in map — message ignored for decoration.

## Showcase

**Page:** `examples/src/pages/commitment-viz-page.ts`

Sections:
1. State pills — all 7 states in both sizes, with/without icons
2. Transition badges — common transitions in full and compact mode
3. Range bars — compact and detailed modes: active (pulsing), fulfilled (complete), expired (overdue), acknowledged with deadline marker
4. Feed decoration demo — standalone mock feed wrapper demonstrating `decorateCommitmentRanges()` with left-border tinting on commitment spans. Does not modify the real `channel-feed` component.

**Mock data:** `examples/mock-data/commitment-viz.json`

## Testing Strategy

Per-component test files covering:
- All 7 states render correctly (pill: x 2 sizes)
- Property reactivity (state change -> re-render)
- Accessibility (ARIA labels, colour not sole information carrier, compact range bar has title attribute)
- Edge cases (undefined optionals, unknown state values)

Range-decorator pure function tests:
- Single commitment span
- Multiple overlapping commitments
- Open vs resolved spans (terminal state detection from commitment record)
- No-correlationId messages ignored
- Empty inputs

No integration tests between commitment-viz and channel-feed at this stage.

## Issue #24 — kpi-metric-row density-responsive sparkline height

Separate concern, batched on this branch. Not architecturally related to commitment-viz.

The `density` property already exists on `kpi-metric-row` with `'comfortable' | 'compact' | 'dense'` values, including grid minmax breakpoints (160px/120px/90px), card padding (16px/12px/8px), and value font-size scaling. What's missing is density-responsive sparkline height — the current implementation hardcodes `height: 20` for all densities.

**Change:** Pass density-aware height to `renderSparkline()`:

| Density | Sparkline height |
|---------|-----------------|
| comfortable | 40px |
| compact | 32px |
| dense | 24px |

The `columns` property (fixed column count) takes precedence over density-driven auto-fill when both are set.

## Future Work (Not This Branch)

Each deferred item is tracked as a GitHub issue:

- **Refactor `commitmentLifecycleStrategy`** to derive from qhorus 7-state model rather than maintaining its own 4-stage model. (#100)
- **Adopt `commitment-state-pill`** in `channel-message` and `channel-task-panel` — replace duplicated badge CSS. During adoption, fix `channel-feed`'s dead `commitments` property (wrong type `Map<string, CommitmentState>`, never referenced in render) and reconcile the task panel's commitment lookup key (`msg.id` vs canonical `correlationId`). (#101)
