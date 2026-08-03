import { parse as parseYaml } from 'yaml';
import { createGraph } from '@casehubio/graph-core';
import type { GraphNode, GraphEdge, GraphModel } from '@casehubio/graph-core';
import type { CaseDefinition } from '../types/case-definition.js';

export function toGraph(yaml: string): GraphModel {
  const def = parseYaml(yaml) as CaseDefinition;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const capabilityToWorker = new Map<string, string>();

  for (const worker of def.spec.workers ?? []) {
    const nodeId = `worker:${worker.name}`;
    nodes.push({
      id: nodeId,
      type: 'worker',
      properties: { ...worker },
    });
    for (const cap of worker.capabilities) {
      capabilityToWorker.set(cap, nodeId);
    }
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

  for (const milestone of def.spec.milestones ?? []) {
    nodes.push({
      id: `milestone:${milestone.name}`,
      type: 'milestone',
      properties: { ...milestone },
    });
  }

  for (const goal of def.spec.goals ?? []) {
    nodes.push({
      id: `goal:${goal.name}`,
      type: 'goal',
      properties: { ...goal },
    });
  }

  return createGraph(nodes, edges);
}
