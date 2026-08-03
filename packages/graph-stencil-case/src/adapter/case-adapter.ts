import { parse as parseYaml } from 'yaml';
import { createGraph } from '@casehubio/graph-core';
import type { GraphNode, GraphEdge, GraphModel } from '@casehubio/graph-core';
import type { CaseDefinition } from '../types/case-definition.js';

export interface AdapterResult {
  readonly model: GraphModel;
  readonly yamlPaths: ReadonlyMap<string, readonly (string | number)[]>;
}

export function toGraph(yaml: string): AdapterResult {
  const def = parseYaml(yaml) as CaseDefinition;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const yamlPaths = new Map<string, (string | number)[]>();

  const capabilityToWorker = new Map<string, string>();

  let workerIndex = 0;
  for (const worker of def.spec.workers ?? []) {
    const nodeId = `worker:${worker.name}`;
    nodes.push({
      id: nodeId,
      type: 'worker',
      properties: { ...worker },
    });
    yamlPaths.set(nodeId, ['spec', 'workers', workerIndex]);
    for (const cap of worker.capabilities) {
      capabilityToWorker.set(cap, nodeId);
    }
    workerIndex++;
  }

  let bindingIndex = 0;
  for (const binding of def.spec.bindings ?? []) {
    const nodeId = binding.name
      ? `binding:${binding.name}`
      : `binding:_${bindingIndex}`;
    nodes.push({
      id: nodeId,
      type: 'binding',
      properties: { ...binding },
    });
    yamlPaths.set(nodeId, ['spec', 'bindings', bindingIndex]);

    if (binding.capability) {
      const workerNodeId = capabilityToWorker.get(binding.capability);
      if (workerNodeId) {
        edges.push({
          id: `${nodeId}--capability-dispatch--${workerNodeId}`,
          type: 'capability-dispatch',
          source: nodeId,
          target: workerNodeId,
        });
      } else {
        const externalId = `external:${binding.capability}`;
        if (!nodes.some(n => n.id === externalId)) {
          nodes.push({
            id: externalId,
            type: 'external',
            properties: { name: binding.capability },
          });
        }
        edges.push({
          id: `${nodeId}--capability-dispatch--${externalId}`,
          type: 'capability-dispatch',
          source: nodeId,
          target: externalId,
        });
      }
    }

    if (binding.subCase) {
      const sub = binding.subCase;
      const subId = `subcase:${sub.namespace}/${sub.name}`;
      if (!nodes.some(n => n.id === subId)) {
        nodes.push({
          id: subId,
          type: 'subcase',
          properties: { ...sub },
        });
      }
      edges.push({
        id: `${nodeId}--subcase-spawn--${subId}`,
        type: 'subcase-spawn',
        source: nodeId,
        target: subId,
      });
    }

    bindingIndex++;
  }

  let milestoneIndex = 0;
  for (const milestone of def.spec.milestones ?? []) {
    const nodeId = `milestone:${milestone.name}`;
    nodes.push({
      id: nodeId,
      type: 'milestone',
      properties: { ...milestone },
    });
    yamlPaths.set(nodeId, ['spec', 'milestones', milestoneIndex]);
    milestoneIndex++;
  }

  let goalIndex = 0;
  for (const goal of def.spec.goals ?? []) {
    const nodeId = `goal:${goal.name}`;
    nodes.push({
      id: nodeId,
      type: 'goal',
      properties: { ...goal },
    });
    yamlPaths.set(nodeId, ['spec', 'goals', goalIndex]);
    goalIndex++;
  }

  return { model: createGraph(nodes, edges), yamlPaths };
}
