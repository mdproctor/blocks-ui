import { describe, it, expect } from 'vitest';
import type {
  AgentControlConfig, AgentImprovementView, AgentDetailProps,
} from './types.js';
import { SAFE_ACTIONS } from './types.js';
import type {
  MethodologyMetadata, MethodologyEvent,
} from '@casehubio/blocks-ui-evolution-config';

describe('types', () => {
  it('SAFE_ACTIONS contains only non-destructive actions', () => {
    expect(SAFE_ACTIONS).toEqual(['PAUSE', 'RESUME']);
  });

  it('MethodologyMetadata shape is correct', () => {
    const meta: MethodologyMetadata = {
      activeSkill: 'brainstorming',
      currentArtifact: 'spec',
      startedAt: '2026-09-30T00:00:00Z',
      updatedAt: '2026-09-30T00:05:00Z',
    };
    expect(meta.activeSkill).toBe('brainstorming');
  });

  it('MethodologyEvent with SkillEventPayload compiles', () => {
    const event: MethodologyEvent = {
      id: 'e1',
      type: 'SKILL_STARTED',
      improvementCaseId: 'imp-1',
      sessionId: 'sess-1',
      timestamp: '2026-09-30T00:00:00Z',
      evolutionStage: 'implement',
      payload: { type: 'SKILL_STARTED', skillName: 'brainstorming' },
    };
    expect(event.payload.type).toBe('SKILL_STARTED');
  });

  it('AgentControlConfig defaults allow no destructive actions', () => {
    const config: AgentControlConfig = {};
    expect(config.allowedActions).toBeUndefined();
  });
});
