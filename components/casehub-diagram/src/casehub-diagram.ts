import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { toGraph, toReactFlowGraph, registerCaseStencils } from '@casehubio/graph-stencil-case';
import { computeElkLayout } from '@casehubio/graph-renderer';
import type { RFNode, RFEdge } from '@casehubio/graph-stencil-case';
import '@casehubio/graph-renderer';

@customElement('casehub-diagram')
export class CasehubDiagram extends LitElement {
  @property() yaml = '';
  @property() src = '';

  @state() private _nodes: RFNode[] = [];
  @state() private _edges: RFEdge[] = [];
  @state() private _error = '';

  override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    registerCaseStencils();
  }

  override async updated(changed: Map<string, unknown>): Promise<void> {
    if (changed.has('yaml') && this.yaml) {
      await this._renderGraph(this.yaml);
    }
    if (changed.has('src') && this.src) {
      try {
        const response = await fetch(this.src);
        const text = await response.text();
        await this._renderGraph(text);
      } catch (e) {
        this._error = `Failed to fetch ${this.src}: ${e}`;
      }
    }
  }

  private async _renderGraph(yamlStr: string): Promise<void> {
    try {
      this._error = '';
      const model = toGraph(yamlStr);
      const { nodes, edges } = toReactFlowGraph(model);
      this._nodes = await computeElkLayout(nodes, edges, { direction: 'DOWN', spacing: 60 }) as RFNode[];
      this._edges = edges;
    } catch (e) {
      this._error = String(e);
    }
  }

  override render() {
    if (this._error) {
      return html`<div style="color: red; padding: 16px;">${this._error}</div>`;
    }
    return html`
      <pages-graph-canvas
        .nodes=${this._nodes}
        .edges=${this._edges}
        style="width: 100%; height: 100%;"
      ></pages-graph-canvas>
    `;
  }
}
