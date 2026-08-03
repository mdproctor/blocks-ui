import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { toGraph } from './case-adapter.js';

const EXAMPLE_YAML = readFileSync(
  resolve(import.meta.dirname, '../../../../../engine/schema/src/main/resources/examples/document-processing.yaml'),
  'utf-8',
);

describe('toGraph', () => {
  it('creates worker nodes from spec.workers', () => {
    const model = toGraph(EXAMPLE_YAML);
    const workers = model.nodes.filter(n => n.type === 'worker');
    expect(workers).toHaveLength(5);
    expect(workers.map(w => w.id)).toContain('worker:ocr-worker');
    expect(workers[0]!.properties['name']).toBe('ocr-worker');
    expect(workers[0]!.properties['capabilities']).toEqual(['ocr']);
  });

  it('creates binding nodes from spec.bindings', () => {
    const model = toGraph(EXAMPLE_YAML);
    const bindings = model.nodes.filter(n => n.type === 'binding');
    expect(bindings).toHaveLength(6);
    expect(bindings.map(b => b.id)).toContain('binding:extract-text');
  });

  it('creates milestone nodes', () => {
    const model = toGraph(EXAMPLE_YAML);
    const milestones = model.nodes.filter(n => n.type === 'milestone');
    expect(milestones).toHaveLength(3);
    expect(milestones[0]!.properties['name']).toBe('text-extracted');
    expect(milestones[0]!.properties['condition']).toContain('.ocrResult');
  });

  it('creates goal nodes', () => {
    const model = toGraph(EXAMPLE_YAML);
    const goals = model.nodes.filter(n => n.type === 'goal');
    expect(goals).toHaveLength(1);
    expect(goals[0]!.properties['kind']).toBe('success');
  });

  it('derives capability-dispatch edges from binding.capability → worker.capabilities[]', () => {
    const model = toGraph(EXAMPLE_YAML);
    const capEdges = model.edges.filter(e => e.type === 'capability-dispatch');
    expect(capEdges).toHaveLength(6);

    const ocrEdge = capEdges.find(e => e.source === 'binding:extract-text');
    expect(ocrEdge).toBeDefined();
    expect(ocrEdge!.target).toBe('worker:ocr-worker');
  });

  it('creates external nodes for unresolvable capabilities', () => {
    const yamlWithExternal = EXAMPLE_YAML.replace(
      'capabilities: [ "ocr" ]',
      'capabilities: [ "unused-cap" ]',
    );
    const model = toGraph(yamlWithExternal);
    const extNodes = model.nodes.filter(n => n.type === 'external');
    expect(extNodes.length).toBeGreaterThan(0);
    expect(extNodes.some(n => n.id === 'external:ocr')).toBe(true);
  });

  it('carries trigger info in binding properties', () => {
    const model = toGraph(EXAMPLE_YAML);
    const binding = model.nodes.find(n => n.id === 'binding:on-external-document');
    expect(binding).toBeDefined();
    const on = binding!.properties['on'] as Record<string, unknown>;
    expect(on['cloudEvent']).toBeDefined();
  });
});
