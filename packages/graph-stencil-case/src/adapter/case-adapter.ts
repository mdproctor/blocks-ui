import type { DomainAdapter, GraphModel, GraphEdit } from '@casehubio/graph-core';

export class CaseAdapter implements DomainAdapter<string> {
  toGraph(yamlSource: string): GraphModel {
    // TODO: parse YAML, produce graph model
    // - Workers as container nodes
    // - Bindings as nodes with trigger/target
    // - Milestones as diamond nodes
    // - Goals as terminal nodes
    // - Edges: capability dispatch, sub-case references, goal criteria
    return { nodes: [], edges: [] };
  }

  applyEdit(yamlSource: string, edit: GraphEdit): string {
    // TODO: apply structural edit to YAML, return updated YAML
    return yamlSource;
  }
}
