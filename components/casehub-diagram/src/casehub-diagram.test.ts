import { describe, it, expect } from 'vitest';
import { toGraph, toReactFlowGraph } from '@casehubio/graph-stencil-case';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EXAMPLE_YAML = readFileSync(
  resolve(import.meta.dirname, '../../../../engine/schema/src/main/resources/examples/document-processing.yaml'),
  'utf-8',
);

describe('casehub-diagram integration', () => {
  it('end-to-end: YAML → GraphModel → React Flow nodes', () => {
    const model = toGraph(EXAMPLE_YAML);
    const { nodes, edges } = toReactFlowGraph(model);

    expect(nodes.length).toBeGreaterThan(0);
    expect(edges.length).toBeGreaterThan(0);

    const workerNodes = nodes.filter(n => n.type === 'worker');
    expect(workerNodes).toHaveLength(5);

    const bindingNodes = nodes.filter(n => n.type === 'binding');
    expect(bindingNodes).toHaveLength(6);

    expect(edges.every(e => nodes.some(n => n.id === e.source))).toBe(true);
    expect(edges.every(e => nodes.some(n => n.id === e.target))).toBe(true);
  });

  it('milestones and goals are present in output', () => {
    const model = toGraph(EXAMPLE_YAML);
    const { nodes } = toReactFlowGraph(model);

    const milestones = nodes.filter(n => n.type === 'milestone');
    expect(milestones).toHaveLength(3);

    const goals = nodes.filter(n => n.type === 'goal');
    expect(goals).toHaveLength(1);
  });

  it('all edges reference valid nodes', () => {
    const model = toGraph(EXAMPLE_YAML);
    const { nodes, edges } = toReactFlowGraph(model);
    const nodeIds = new Set(nodes.map(n => n.id));

    for (const edge of edges) {
      expect(nodeIds.has(edge.source), `dangling source: ${edge.source}`).toBe(true);
      expect(nodeIds.has(edge.target), `dangling target: ${edge.target}`).toBe(true);
    }
  });
});
