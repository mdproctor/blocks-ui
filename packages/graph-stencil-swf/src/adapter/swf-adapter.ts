import type { DomainAdapter, GraphModel, GraphEdit } from '@casehubio/graph-core';

export class SwfAdapter implements DomainAdapter<string> {
  toGraph(workflowYaml: string): GraphModel {
    // TODO: use @openworkflowspec/sdk to parse and build FlatGraph
    // then adapt to our GraphModel
    return { nodes: [], edges: [] };
  }

  applyEdit(workflowYaml: string, edit: GraphEdit): string {
    // TODO: apply edit to SWF YAML
    return workflowYaml;
  }
}
