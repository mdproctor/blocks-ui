import { registerGrammar } from '@casehubio/graph-core';
import { registerNodeType } from '@casehubio/graph-renderer';
import { createReactNodeType } from '../bridge/create-react-node-type.js';
import { bindingGrammar, renderBinding } from './binding.js';
import { workerGrammar, renderWorker } from './worker.js';
import { milestoneGrammar, renderMilestone } from './milestone.js';
import { goalGrammar, renderGoal } from './goal.js';
import { subcaseGrammar, renderSubCase } from './subcase.js';

let registered = false;

export function registerCaseStencils(): void {
  if (registered) return;
  registered = true;

  const stencils = [
    { grammar: bindingGrammar, render: renderBinding },
    { grammar: workerGrammar, render: renderWorker },
    { grammar: milestoneGrammar, render: renderMilestone },
    { grammar: goalGrammar, render: renderGoal },
    { grammar: subcaseGrammar, render: renderSubCase },
  ];

  for (const s of stencils) {
    registerGrammar(s.grammar);
    registerNodeType({
      type: s.grammar.type,
      component: createReactNodeType(s.render),
    });
  }
}
