## D1: Case form migration strategy

**Choice:** Migrate all case stencil types to schema-driven rendering
**Alternatives:**
- Hybrid (schemas for simple, hand-coded for complex) — two rendering paths coexist, inconsistent consumer experience
- Schemas alongside hand-coded renderers — schemas become documentation, not drivers; doesn't integrate with pages-property-palette
**Rationale:** Uniform approach across all stencil types. Works with pages-property-palette (pages#373). Eliminates the hand-coded renderAgentForm/renderA2AForm/renderMcpForm renderers that can't be consumed by the generic palette.
**Trade-offs:** Complex worker-function forms (agent config, MCP transport, auth) must be expressible in JSON Schema with extensions. If a form can't be expressed in schema, it needs a custom x-display-hint editor registered with the palette.
**Sources:** packages/graph-stencil-case/src/worker-function/ (existing hand-coded renderers), casehubio/casehub-pages#373 (PropertyPaletteSource SPI)
**Exploration:** quick
**Status:** captured

## D2: Schema location

**Choice:** In each stencil package (graph-stencil-case/src/schemas/, etc.)
**Alternatives:**
- Central schema registry in diagram-core — inverts the dependency direction (diagram-core shouldn't know about domain stencils)
- Separate schema package — adds maintenance overhead without clear benefit
**Rationale:** Each stencil package already owns its domain types, adapter, and visual stencils. Property schemas are domain-specific — they belong with the stencils they describe. Follows the existing pattern where registerCaseStencils() is called from graph-stencil-case.
**Trade-offs:** Consumers importing from multiple stencil packages get schemas from multiple locations. The registration pattern (D4) handles this.
**Sources:** packages/graph-stencil-case/src/index.ts, packages/graph-stencil-swf/src/index.ts, docs/protocols/blocks-ui/stencil-package-isolation.md
**Exploration:** quick
**Status:** captured

## D3: Worker-function polymorphism

**Choice:** oneOf with x-discriminator pointing to the function-type field
**Alternatives:**
- Flat schema with conditional x-visibility — simpler schema but complex visibility expressions, harder to validate
- Separate schemas per function type — no polymorphism in schema, diagram must select schema externally
**Rationale:** JSON Schema oneOf is the standard way to represent discriminated unions. The existing trigger-editor already handles oneOf with radio buttons for type selection. pages-property-palette (pages#373) will render a type selector that swaps the sub-schema based on x-discriminator.
**Trade-offs:** oneOf schemas are more complex to author and validate. Each function type's sub-schema must be self-contained.
**Sources:** packages/diagram-core/src/form/trigger-editor.ts (existing oneOf handling), JSON Schema spec §10.2.1.3
**Exploration:** quick
**Depends on:** D1 (migration to schema-driven)
**Status:** captured

## D4: Schema registration timing

**Choice:** Same registration call — registerCaseStencils() registers both visuals and schemas
**Alternatives:**
- Separate registration — more granular but consumers must remember both calls
**Rationale:** Consumers can't forget to register schemas without also forgetting stencils. One call, everything works. Schemas are also exported individually for consumers who need them standalone (e.g. for validation without rendering).
**Trade-offs:** registerCaseStencils() does more work. If a consumer only wants visuals (unlikely), they get schemas too.
**Sources:** packages/graph-stencil-case/src/stencils/ (existing registration pattern)
**Exploration:** quick
**Depends on:** D2 (schemas in stencil packages)
**Status:** captured
