import type { GraphModel } from '@casehubio/graph-core';

export interface RFNode {
  readonly id: string;
  readonly type: string;
  readonly position: { readonly x: number; readonly y: number };
  readonly data: Record<string, unknown>;
  readonly parentId?: string;
}

export interface RFEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly type?: string;
}

export function toReactFlowGraph(model: GraphModel): { nodes: RFNode[]; edges: RFEdge[] } {
  const nodes: RFNode[] = model.nodes.map(gn => ({
    id: gn.id,
    type: gn.type,
    position: { x: 0, y: 0 },
    data: { ...gn.properties },
    ...(gn.parentId !== undefined ? { parentId: gn.parentId } : {}),
  }));

  const edges: RFEdge[] = model.edges.map(ge => ({
    id: ge.id,
    source: ge.source,
    target: ge.target,
    type: ge.type,
  }));

  return { nodes, edges };
}
