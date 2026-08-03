import { describe, it, expect } from 'vitest';
import { toGraph, toReactFlowGraph, applyPropertyEdit } from '@casehubio/graph-stencil-case';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EXAMPLE_YAML = readFileSync(
  resolve(import.meta.dirname, '../../../../engine/schema/src/main/resources/examples/document-processing.yaml'),
  'utf-8',
);

describe('casehub-diagram integration', () => {
  it('end-to-end: YAML → GraphModel → React Flow nodes', () => {
    const { model } = toGraph(EXAMPLE_YAML);
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
    const { model } = toGraph(EXAMPLE_YAML);
    const { nodes } = toReactFlowGraph(model);

    const milestones = nodes.filter(n => n.type === 'milestone');
    expect(milestones).toHaveLength(3);

    const goals = nodes.filter(n => n.type === 'goal');
    expect(goals).toHaveLength(1);
  });

  it('all edges reference valid nodes', () => {
    const { model } = toGraph(EXAMPLE_YAML);
    const { nodes, edges } = toReactFlowGraph(model);
    const nodeIds = new Set(nodes.map(n => n.id));

    for (const edge of edges) {
      expect(nodeIds.has(edge.source), `dangling source: ${edge.source}`).toBe(true);
      expect(nodeIds.has(edge.target), `dangling target: ${edge.target}`).toBe(true);
    }
  });
});

describe('edit cycle', () => {
  it('applyPropertyEdit updates YAML and re-parse produces updated model', () => {
    const result = toGraph(EXAMPLE_YAML);
    const bindingPath = result.yamlPaths.get('binding:extract-text');
    expect(bindingPath).toBeDefined();

    const newYaml = applyPropertyEdit(
      EXAMPLE_YAML,
      [...bindingPath!],
      ['when'],
      '.changed == true',
    );
    const updated = toGraph(newYaml);
    const binding = updated.model.nodes.find(n => n.id === 'binding:extract-text');
    expect(binding!.properties['when']).toBe('.changed == true');
  });

  it('skipping re-layout preserves node positions', () => {
    const result = toGraph(EXAMPLE_YAML);
    const { nodes } = toReactFlowGraph(result.model);
    const positioned = nodes.map(n => ({ ...n, position: { x: 100, y: 200 } }));

    const newYaml = applyPropertyEdit(
      EXAMPLE_YAML,
      [...result.yamlPaths.get('binding:extract-text')!],
      ['when'],
      '.changed',
    );
    const updated = toGraph(newYaml);
    const { nodes: newNodes } = toReactFlowGraph(updated.model);

    const merged = newNodes.map(n => {
      const existing = positioned.find(p => p.id === n.id);
      return existing ? { ...n, position: existing.position } : n;
    });

    const binding = merged.find(n => n.id === 'binding:extract-text')!;
    expect(binding.position).toEqual({ x: 100, y: 200 });
    expect(binding.data['when']).toBe('.changed');
  });
});
