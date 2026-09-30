import { emitPagesEvent } from '@casehubio/pages-data';

export const AgentDetailEventTopics = {
  AGENT_SELECTED: 'evolution:agent-selected',
  AGENT_DESELECTED: 'evolution:agent-deselected',
  AGENT_ACTION: 'evolution:agent-action',
} as const;

export function emitAgentDetailEvent(
  target: EventTarget, topic: string, payload: Record<string, unknown>,
): void {
  emitPagesEvent(target, topic, payload);
}
