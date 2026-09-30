import type { ImprovementStreamView, MethodologyMetadata, MethodologyEvent } from '@casehubio/blocks-ui-evolution-config';

export type SafeAgentAction = 'PAUSE' | 'RESUME';
export type DestructiveAgentAction = 'FORCE_TRANSITION' | 'REASSIGN' | 'TERMINATE';
export type AgentAction = SafeAgentAction | DestructiveAgentAction | 'INTERVENE';

export const SAFE_ACTIONS: readonly SafeAgentAction[] = ['PAUSE', 'RESUME'];

export interface AgentControlConfig {
  readonly allowedActions?: readonly AgentAction[];
}

export interface AgentImprovementView {
  readonly stream: ImprovementStreamView;
  readonly sessionId: string | null;
  readonly methodology: MethodologyMetadata | null;
}

export interface AgentDetailProps {
  endpoint?: string;
  caseId?: string;
  tenancyId?: string;
  improvementCaseId?: string;
  sessionId?: string;
  controlConfig?: AgentControlConfig;
  data?: AgentImprovementView;
  events?: readonly MethodologyEvent[];
  pushUrl?: string;
  pushTopics?: readonly string[];
}
