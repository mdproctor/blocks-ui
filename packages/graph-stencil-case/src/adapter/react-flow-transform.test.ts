import { describe, it, expect } from 'vitest';
import type { GraphModel } from '@casehubio/graph-core';
import { toReactFlowGraph } from './react-flow-transform.js';

const SAMPLE_MODEL: GraphModel = {
  nodes: [
    { id: 'worker:ocr', type: 'worker', properties: { name: 'ocr', capabilities: ['ocr'] } },
    { id: 'binding:scan', type: 'binding', properties: { name: 'scan', capability: 'ocr' } },
  ],
  edges: [
    { id: 'binding:scan--capability-dispatch--worker:ocr', type: 'capability-dispatch', source: 'binding:scan', target: 'worker:ocr' },
  ],
};

describe('toReactFlowGraph', () => {
  it('maps GraphNodes to React Flow Nodes with type and data', () => {
    const { nodes } = toReactFlowGraph(SAMPLE_MODEL);
    expect(nodes).toHaveLength(2);

    const workerNode = nodes.find(n => n.id === 'worker:ocr')!;
    expect(workerNode.type).toBe('worker');
    expect(workerNode.data['name']).toBe('ocr');
    expect(workerNode.position).toEqual({ x: 0, y: 0 });
  });

  it('maps GraphEdges to React Flow Edges', () => {
    const { edges } = toReactFlowGraph(SAMPLE_MODEL);
    expect(edges).toHaveLength(1);
    expect(edges[0]!.source).toBe('binding:scan');
    expect(edges[0]!.target).toBe('worker:ocr');
  });

  it('preserves parentId when present', () => {
    const model: GraphModel = {
      nodes: [
        { id: 'parent:a', type: 'worker', properties: {} },
        { id: 'child:b', type: 'binding', parentId: 'parent:a', properties: {} },
      ],
      edges: [],
    };
    const { nodes } = toReactFlowGraph(model);
    const child = nodes.find(n => n.id === 'child:b')!;
    expect(child.parentId).toBe('parent:a');
  });
});
