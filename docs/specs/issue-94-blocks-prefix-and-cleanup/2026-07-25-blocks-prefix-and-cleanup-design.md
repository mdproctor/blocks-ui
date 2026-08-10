# blocks-ui prefix rename and cleanup

**Branch:** issue-94-blocks-prefix-and-cleanup
**Covers:** #94, #93, #88, #96
**Date:** 2026-07-25

## #88 — Fix pages-modal duplicate CustomElementRegistry crash

**Root cause:** pages-primitives barrel re-exports a11y mixins and modal registration together. blocks-ui components import from the barrel for a11y mixins only, pulling in pages-modal as a transitive side effect. In aliased bundler setups (esbuild/Vite), the same module resolves via two paths → two `customElements.define()` calls → crash.

**Fix (pages side — already done):** pages-primitives now has sub-path exports (`./a11y`, `./modal`) and a `sideEffects` array. Garden entry GE-20260720-96fab8.

**Fix (blocks-ui side — this branch):** Change all 16 imports from `'@casehubio/pages-primitives'` to `'@casehubio/pages-primitives/a11y'`. No blocks-ui component uses pages-modal directly.

**Affected files:** 16 component source files across approval-gate, audit-trail-viewer, blocks-timeline, case-explorer (4 files), detail-pane, list-pane, notification-inbox (2 files), routing-rationale, split-workbench, trust-score-panel, trust-workbench, work-item-detail, work-item-workbench.

## #93 — Migrate native HTML elements to pages-ui-components

**Scope:** channel-activity package only (8 source files). 19 `<button>`, 1 `<select>`, 1 `<textarea>` → `<pages-button>`, `<pages-select>`, `<pages-textarea>`. Plus 2 hardcoded colors in channel-nav.ts → `--pages-*` tokens.

**Dependency:** Add `@casehubio/pages-ui-components` as `file:../../../pages/packages/pages-ui-components` to channel-activity's package.json.

**Behaviour:** Unchanged. Only rendering delegates to pages-ui-components. Existing tests must still pass.

**Files:** channel-artifact-panel.ts (3), channel-feed.ts (2), channel-input.ts (2 + select + textarea), channel-message.ts (2), channel-nav.ts (3 + 2 hardcoded colors), channel-reaction-bar.ts (2), channel-thread.ts (1), channel-topic-bar.ts (4).

## #94 — Rename all components to blocks- prefix

**Scope:** 56 custom elements need `blocks-` prefix. 2 already prefixed (blocks-timeline, blocks-confirm-dialog).

**What changes per component:**
1. `@customElement('tag-name')` → `@customElement('blocks-tag-name')`
2. HTML template references in all files: `<tag-name` → `<blocks-tag-name`
3. Test files: tag name strings in `querySelector`, `createElement`, fixture HTML
4. Example pages: template references to the component tags

**What does NOT change:**
- npm package names (`@casehubio/blocks-ui-approval-gate` — already prefixed)
- TypeScript class names (e.g., `ApprovalGate` stays)
- Import paths (e.g., `import '@casehubio/blocks-ui-sla-indicator'` stays)
- Example page tag names (e.g., `approval-gate-page` — app-level, not library)
- Test fixtures (e.g., `test-tab-panel` — test-only)

**Execution order:** Rename in dependency order — leaf components first, composites last. This ensures each component's tests can pass after rename before moving to the next.

## #96 — Close as invalid

No `@casehubio/pages-form` dependencies exist in blocks-ui. The actual `file:` links (to pages-primitives, pages-data, etc.) can't be converted because those packages aren't published to GitHub Packages yet. Close the issue.

## Execution order

1. #88 (16 import changes — foundational, smallest)
2. #93 (channel-activity native element migration — scoped, independent)
3. #94 (full prefix rename — widest blast radius, last)
4. #96 (close issue)

## Out of scope

- Peer repo updates (pages, chat-app consumers break and fix in their own sessions)
- npm package name changes (already correctly prefixed)
- Publishing pages packages to GitHub Packages
- Parent repo docs update (filed as casehubio/parent#393)
