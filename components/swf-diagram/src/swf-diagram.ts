import { LitElement, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { toSwfGraph, applySwfPropertyEdit, registerSwfStencils } from '@casehubio/graph-stencil-swf';
import { DiagramBaseMixin } from '@casehubio/diagram-core';
import type { AdapterResult } from '@casehubio/diagram-core';
import '@casehubio/graph-renderer';

@customElement('swf-diagram')
export class SwfDiagram extends DiagramBaseMixin(LitElement) {
  @property({ attribute: 'layout-direction' })
  layoutDirection: 'DOWN' | 'RIGHT' = 'DOWN';

  override connectedCallback(): void {
    super.connectedCallback();
    registerSwfStencils();
  }

  protected _adaptYaml(yaml: string): AdapterResult {
    return toSwfGraph(yaml);
  }

  protected _applyPropertyEdit(
    yaml: string,
    nodePath: readonly (string | number)[],
    field: (string | number)[],
    value: unknown,
  ): string {
    return applySwfPropertyEdit(yaml, nodePath, field, value);
  }

  protected override _layoutOptions() {
    return { direction: this.layoutDirection, spacing: 40, containerPadding: 25, wrapping: true };
  }

  protected _paletteTypes(): string[] {
    return [];
  }

  protected _emptyTemplate(): string | null {
    return null;
  }

  private _computeFilteredEdges() {
    const nodeParents = new Map(this._nodes.map(n => [n.id, n.parentId]));
    return this._edges.filter(e => {
      const sp = nodeParents.get(e.source);
      const tp = nodeParents.get(e.target);
      if (!sp || !tp || sp !== tp) return true;
      return sp === 'root';
    });
  }

  private _computeFilteredNodes(filteredEdges: typeof this._edges) {
    const connectedIds = new Set(filteredEdges.flatMap(e => [e.source, e.target]));
    const containerTypes = new Set(['swf-try-catch']);
    return this._nodes
      .filter(n => n.type !== 'swf-root')
      .map(n => {
        const cleared = n.parentId === 'root' ? { ...n, parentId: undefined } : { ...n };
        if (!connectedIds.has(n.id)) {
          cleared.data = { ...cleared.data, _hideHandles: true };
        }
        if (containerTypes.has(n.type ?? '')) {
          cleared.style = {
            ...cleared.style,
            background: 'var(--pages-neutral-4, #e5e5e5)',
            border: '2px solid #d97706',
            borderRadius: '10px',
          };
        }
        return cleared;
      });
  }

  override render() {
    if (this._error) {
      return this._renderError();
    }
    const hasSelection = this._selectedNodeId !== '';
    const isReadonly = this.readonly || !!this._adapterResult?.degraded;
    const filteredEdges = this._computeFilteredEdges();
    const filteredNodes = this._computeFilteredNodes(filteredEdges);

    return html`
      <div style="display: flex; flex-direction: column; width: 100%; height: 100%;">
        <diagram-toolbar
          ?hasBackend=${this.backend != null}
          ?hasNodes=${this._nodes.length > 0}
          ?dirty=${this._isDirty}
          ?saving=${this._saving}
          @toolbar-save=${() => this._save()}
          @toolbar-export=${(e: CustomEvent<{ format: 'svg' | 'png' }>) => this._exportDiagram(e.detail.format)}
        ></diagram-toolbar>
        <div style="display: flex; flex: 1; overflow: hidden;">
          <pages-graph-canvas
            .nodes=${filteredNodes}
            .edges=${filteredEdges}
            role="img"
            aria-label="Workflow diagram"
            style="flex: 1; height: 100%;"
            @pages-event=${(e: CustomEvent) => {
              const topic = e.detail?.topic as string | undefined;
              if (topic === 'graph:node-click') this._handleNodeClick(e);
              if (topic === 'graph:selection-change') this._handleSelectionChange(e);
            }}
          ></pages-graph-canvas>
          ${hasSelection && !isReadonly ? html`
            <div style="width: 300px; border-left: 1px solid var(--pages-border-color, #ddd); overflow-y: auto;">
              <diagram-properties
                .schema=${this._selectedSchema}
                .data=${this._selectedData}
                ?readonly=${isReadonly}
                @property-change=${this._handlePropertyChange}
              ></diagram-properties>
            </div>
          ` : nothing}
          ${this._adapterResult?.degraded ? html`
            <div style="position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); background: var(--pages-warning-color, #f59e0b); color: #000; padding: 4px 12px; border-radius: 4px; font-size: 12px;">
              Property editing unavailable — ${this._adapterResult.degraded.reason}
            </div>
          ` : nothing}
        </div>
        ${this._showConflict ? this._renderConflictDialog() : nothing}
      </div>
    `;
  }
}
