import { html } from 'lit-html';
import { registerStencil, registerEdgeType } from '@casehubio/graph-renderer';
import { registerPropertySchema } from '@casehubio/diagram-core';
import { swfTaskSchema } from '../schema/swf-task-schema.js';
import { callGrammar, renderCall } from './call.js';
import { setGrammar, renderSet } from './set.js';
import { switchGrammar, renderSwitch } from './switch.js';
import { raiseGrammar, renderRaise } from './raise.js';
import { tryGrammar, renderTry } from './try.js';
import { tryCatchGrammar, renderTryCatch, renderCatch } from './try-catch.js';
import { startGrammar, endGrammar, entryGrammar, exitGrammar, renderStart, renderEnd, renderEntry, renderExit } from './boundary.js';
import { genericGrammar, renderGeneric } from './generic.js';

const CURSOR_OVERRIDES = `
.react-flow__pane { cursor: default !important; }
.react-flow__pane.dragging { cursor: grabbing !important; }
.react-flow__node { cursor: pointer !important; }
.react-flow__node button { cursor: pointer !important; }
`;

let registered = false;

export function registerSwfStencils(): void {
  if (registered) return;
  registered = true;

  registerStencil({ type: 'swf-call', label: 'Call', icon: 'phone', grammar: callGrammar, render: renderCall, defaultStyle: CURSOR_OVERRIDES });
  registerStencil({ type: 'swf-set', label: 'Set', icon: 'edit', grammar: setGrammar, render: renderSet });
  registerStencil({ type: 'swf-switch', label: 'Switch', icon: 'git-branch', grammar: switchGrammar, render: renderSwitch });
  registerStencil({ type: 'swf-raise', label: 'Raise', icon: 'alert-triangle', grammar: raiseGrammar, render: renderRaise });
  registerStencil({ type: 'swf-try', label: 'Try', icon: 'shield', grammar: tryGrammar, render: renderTry });
  registerStencil({ type: 'swf-try-catch', label: 'Try/Catch', icon: 'shield', grammar: tryCatchGrammar, render: renderTryCatch });
  registerStencil({ type: 'swf-catch', label: 'Catch', icon: 'shield-off', grammar: tryCatchGrammar, render: renderCatch });
  registerStencil({ type: 'swf-start', label: 'Start', icon: 'play', grammar: startGrammar, render: renderStart });
  registerStencil({ type: 'swf-end', label: 'End', icon: 'square', grammar: endGrammar, render: renderEnd });
  registerStencil({ type: 'swf-entry', label: 'Entry', icon: 'log-in', grammar: entryGrammar, render: renderEntry });
  registerStencil({ type: 'swf-exit', label: 'Exit', icon: 'log-out', grammar: exitGrammar, render: renderExit });
  registerStencil({ type: 'swf-generic', label: 'Step', icon: 'box', grammar: genericGrammar, render: renderGeneric });
  registerStencil({ type: 'swf-root', label: 'Workflow', icon: 'box', grammar: genericGrammar, render: () => html`` });

  registerEdgeType({ type: 'flow', label: 'Flow' });
  registerEdgeType({ type: 'switch-case', label: 'Case', defaultStyle: '.switch-case-edge { stroke-dasharray: 4; }' });

  const defs = (swfTaskSchema as any).$defs as Record<string, Record<string, unknown>> | undefined;
  if (defs) {
    const typeMap: Record<string, string> = {
      CallTask: 'swf-call', SetTask: 'swf-set', SwitchTask: 'swf-switch',
      RaiseTask: 'swf-raise', TryTask: 'swf-try', TryCatchTask: 'swf-try-catch',
    };
    for (const [defName, nodeType] of Object.entries(typeMap)) {
      if (defs[defName]) registerPropertySchema(nodeType, defs[defName]);
    }
  }
}
