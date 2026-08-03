import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  toGraph,
  toReactFlowGraph,
  registerCaseStencils,
  applyPropertyEdit,
} from '@casehubio/graph-stencil-case';
import type { AdapterResult, RFNode, RFEdge } from '@casehubio/graph-stencil-case';
import { computeElkLayout } from '@casehubio/graph-renderer';
import '@casehubio/graph-renderer';
import './casehub-diagram-properties.js';

const SCHEMA_TYPE_MAP: Record<string, string> = {
  binding: 'Binding',
  worker: 'Worker',
  milestone: 'Milestone',
  goal: 'Goal',
  subcase: 'SubCase',
};

const MAX_UNDO = 50;

@customElement('casehub-diagram')
export class CasehubDiagram extends LitElement {
  @property() yaml = '';
  @property() src = '';
  @property({ attribute: false }) schema: Record<string, unknown> = {};

  @state() private _nodes: RFNode[] = [];
  @state() private _edges: RFEdge[] = [];
  @state() private _error = '';
  @state() private _selectedNodeId = '';
  @state() private _selectedData: Record<string, unknown> = {};
  @state() private _selectedSchema: Record<string, unknown> = {};

  private _currentYaml = '';
  private _adapterResult: AdapterResult | null = null;
  private _undoStack: string[] = [];
  private _redoStack: string[] = [];

  override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    registerCaseStencils();
    this.addEventListener('keydown', this._handleKeydown);
  }

  override disconnectedCallback(): void {
    this.removeEventListener('keydown', this._handleKeydown);
    super.disconnectedCallback();
  }

  override async updated(changed: Map<string, unknown>): Promise<void> {
    if (changed.has('yaml') && this.yaml) {
      this._currentYaml = this.yaml;
      this._undoStack = [];
      this._redoStack = [];
      this._selectedNodeId = '';
      await this._fullRender(this.yaml);
    }
    if (changed.has('src') && this.src) {
      try {
        const response = await fetch(this.src);
        const text = await response.text();
        this._currentYaml = text;
        this._undoStack = [];
        this._redoStack = [];
        this._selectedNodeId = '';
        await this._fullRender(text);
      } catch (e) {
        this._error = `Failed to fetch ${this.src}: ${e}`;
      }
    }
  }

  private async _fullRender(yamlStr: string): Promise<void> {
    try {
      this._error = '';
      this._adapterResult = toGraph(yamlStr);
      const { nodes, edges } = toReactFlowGraph(this._adapterResult.model);
      this._nodes = await computeElkLayout(nodes, edges, { direction: 'DOWN', spacing: 60 }) as RFNode[];
      this._edges = edges;
    } catch (e) {
      this._error = String(e);
    }
  }

  private _updateWithoutLayout(yamlStr: string): void {
    try {
      this._error = '';
      this._adapterResult = toGraph(yamlStr);
      const { nodes, edges } = toReactFlowGraph(this._adapterResult.model);
      const posMap = new Map(this._nodes.map(n => [n.id, n.position]));
      this._nodes = nodes.map(n => ({
        ...n,
        position: posMap.get(n.id) ?? n.position,
      }));
      this._edges = edges;
      this._updateSelectedNode();
    } catch (e) {
      this._error = `Edit failed: ${e}`;
      this._currentYaml = this._undoStack.pop() ?? this._currentYaml;
    }
  }

  private _updateSelectedNode(): void {
    if (!this._selectedNodeId || !this._adapterResult) {
      this._selectedData = {};
      this._selectedSchema = {};
      return;
    }
    const node = this._adapterResult.model.nodes.find(n => n.id === this._selectedNodeId);
    if (!node) {
      this._selectedNodeId = '';
      this._selectedData = {};
      this._selectedSchema = {};
      return;
    }
    this._selectedData = { ...node.properties };
    const defKey = SCHEMA_TYPE_MAP[node.type];
    if (defKey && this.schema.$defs) {
      this._selectedSchema = (this.schema.$defs as Record<string, Record<string, unknown>>)[defKey] ?? {};
    }
  }

  private _handleNodeClick = (e: Event): void => {
    const detail = (e as CustomEvent<{ nodeId: string }>).detail;
    this._selectedNodeId = detail.nodeId;
    this._updateSelectedNode();
  };

  private _handleSelectionChange = (e: Event): void => {
    const detail = (e as CustomEvent<{ nodeIds: string[] }>).detail;
    if (detail.nodeIds.length === 0) {
      this._selectedNodeId = '';
      this._selectedData = {};
      this._selectedSchema = {};
    }
  };

  private _handlePropertyChange = (e: Event): void => {
    const detail = (e as CustomEvent<{ field: (string | number)[]; value: unknown }>).detail;
    if (!this._selectedNodeId || !this._adapterResult) return;

    const nodePath = this._adapterResult.yamlPaths.get(this._selectedNodeId);
    if (!nodePath) return;

    this._undoStack.push(this._currentYaml);
    if (this._undoStack.length > MAX_UNDO) this._undoStack.shift();
    this._redoStack = [];

    try {
      this._currentYaml = applyPropertyEdit(
        this._currentYaml,
        nodePath,
        detail.field,
        detail.value,
      );
      this._updateWithoutLayout(this._currentYaml);
    } catch (e) {
      this._currentYaml = this._undoStack.pop() ?? this._currentYaml;
      this._error = `Edit failed: ${e}`;
    }
  };

  private _handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      this._selectedNodeId = '';
      this._selectedData = {};
      this._selectedSchema = {};
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      this._undo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      this._redo();
    }
  };

  private _undo(): void {
    if (this._undoStack.length === 0) return;
    this._redoStack.push(this._currentYaml);
    this._currentYaml = this._undoStack.pop()!;
    this._updateWithoutLayout(this._currentYaml);
  }

  private _redo(): void {
    if (this._redoStack.length === 0) return;
    this._undoStack.push(this._currentYaml);
    this._currentYaml = this._redoStack.pop()!;
    this._updateWithoutLayout(this._currentYaml);
  }

  override render() {
    if (this._error) {
      return html`<div style="color: red; padding: 16px;">${this._error}</div>`;
    }
    const hasSelection = this._selectedNodeId !== '';
    const isExternal = hasSelection && this._adapterResult?.model.nodes.find(n => n.id === this._selectedNodeId)?.type === 'external';

    return html`
      <div style="display: flex; width: 100%; height: 100%;">
        <pages-graph-canvas
          .nodes=${this._nodes}
          .edges=${this._edges}
          style="flex: 1; height: 100%;"
          @pages-event=${(e: CustomEvent) => {
            const topic = e.detail?.topic as string | undefined;
            if (topic === 'graph:node-click') this._handleNodeClick(e);
            if (topic === 'graph:selection-change') this._handleSelectionChange(e);
          }}
        ></pages-graph-canvas>
        ${hasSelection ? html`
          <div style="width: 300px; border-left: 1px solid var(--pages-border-color, #ddd); overflow-y: auto;">
            <casehub-diagram-properties
              .schema=${this._selectedSchema}
              .data=${this._selectedData}
              ?readonly=${isExternal ?? false}
              @property-change=${this._handlePropertyChange}
            ></casehub-diagram-properties>
          </div>
        ` : nothing}
      </div>
    `;
  }
}
