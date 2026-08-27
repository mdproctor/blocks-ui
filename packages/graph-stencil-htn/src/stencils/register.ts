import { registerStencil } from '@casehubio/graph-renderer';
import { registerPropertySchema } from '@casehubio/diagram-core';
import { dagNodeGrammar, renderDagNode } from './dag-node.js';
import { dagNodeSchema, primitivePlanItemSchema, compoundPlanItemSchema } from '../schemas/index.js';

let registered = false;

export function registerHtnStencils(): void {
  if (registered) return;
  registered = true;

  registerStencil({
    type: 'dag-node',
    label: 'Task',
    icon: 'box',
    grammar: dagNodeGrammar,
    render: renderDagNode,
  });

  registerPropertySchema('dag-node', dagNodeSchema);
  registerPropertySchema('primitive-plan-item', primitivePlanItemSchema);
  registerPropertySchema('compound-plan-item', compoundPlanItemSchema);
}
