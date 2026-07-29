import type { TimelineStrategy, StageConfig } from '../types.js';
import { stateProgressionStrategy, QHORUS_STAGES } from './state-progression.js';
import type { StateData, ResolveStatus } from './state-progression.js';

export interface CommitmentLifecycleData {
  readonly id: string;
  readonly currentStage: string;
  readonly stages: ReadonlyArray<{
    readonly key: string;
    readonly actor?: string;
    readonly timestamp?: string;
    readonly status: string;
  }>;
  readonly messages?: ReadonlyArray<{
    readonly sender: string;
    readonly content: string;
    readonly timestamp: string;
  }>;
}

export function commitmentLifecycleStrategy(options?: {
  stages?: StageConfig[];
  resolveStatus?: ResolveStatus;
}): TimelineStrategy<StateData> {
  const base = stateProgressionStrategy({
    stages: options?.stages ?? QHORUS_STAGES,
    resolveStatus: options?.resolveStatus,
  });
  return {
    ...base,
    transformData(raw: unknown): StateData {
      const commitment = raw as CommitmentLifecycleData;
      return {
        currentState: commitment.currentStage,
        transitions: commitment.stages.map(s => ({
          state: s.key,
          ...(s.actor !== undefined ? { actor: s.actor } : {}),
          ...(s.timestamp !== undefined ? { timestamp: s.timestamp } : {}),
        })),
      };
    },
  };
}
