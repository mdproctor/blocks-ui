import type { MethodologyMetadata, MethodologyEvent } from '@casehubio/blocks-ui-evolution-config';
import type { AgentImprovementView } from './types.js';

export const sampleMethodologyMetadata: MethodologyMetadata = {
  activeSkill: 'test-driven-development',
  currentArtifact: 'test',
  startedAt: '2026-09-30T09:00:00Z',
  updatedAt: '2026-09-30T09:45:00Z',
};

export const sampleMethodologyEvents: MethodologyEvent[] = [
  {
    id: 'me-1', type: 'SKILL_STARTED', improvementCaseId: 'imp-1', sessionId: 'sess-1',
    timestamp: '2026-09-30T09:00:00Z', evolutionStage: 'implement',
    payload: { type: 'SKILL_STARTED', skillName: 'brainstorming' },
  },
  {
    id: 'me-2', type: 'SKILL_COMPLETED', improvementCaseId: 'imp-1', sessionId: 'sess-1',
    timestamp: '2026-09-30T09:10:00Z', evolutionStage: 'implement',
    payload: { type: 'SKILL_COMPLETED', skillName: 'brainstorming', duration: 600000 },
  },
  {
    id: 'me-3', type: 'ARTIFACT_CREATED', improvementCaseId: 'imp-1', sessionId: 'sess-1',
    timestamp: '2026-09-30T09:10:30Z', evolutionStage: 'implement',
    payload: { type: 'ARTIFACT_CREATED', artifactType: 'spec', path: 'specs/design.md' },
  },
  {
    id: 'me-4', type: 'SKILL_STARTED', improvementCaseId: 'imp-1', sessionId: 'sess-1',
    timestamp: '2026-09-30T09:15:00Z', evolutionStage: 'implement',
    payload: { type: 'SKILL_STARTED', skillName: 'writing-plans' },
  },
  {
    id: 'me-5', type: 'SKILL_COMPLETED', improvementCaseId: 'imp-1', sessionId: 'sess-1',
    timestamp: '2026-09-30T09:25:00Z', evolutionStage: 'implement',
    payload: { type: 'SKILL_COMPLETED', skillName: 'writing-plans', duration: 600000 },
  },
  {
    id: 'me-6', type: 'ARTIFACT_CREATED', improvementCaseId: 'imp-1', sessionId: 'sess-1',
    timestamp: '2026-09-30T09:25:30Z', evolutionStage: 'implement',
    payload: { type: 'ARTIFACT_CREATED', artifactType: 'plan', path: 'plans/impl.md' },
  },
  {
    id: 'me-7', type: 'SKILL_STARTED', improvementCaseId: 'imp-1', sessionId: 'sess-1',
    timestamp: '2026-09-30T09:30:00Z', evolutionStage: 'implement',
    payload: { type: 'SKILL_STARTED', skillName: 'test-driven-development' },
  },
  {
    id: 'me-8', type: 'TEST_PASSED', improvementCaseId: 'imp-1', sessionId: 'sess-1',
    timestamp: '2026-09-30T09:40:00Z', evolutionStage: 'implement',
    payload: { type: 'TEST_PASSED', testCount: 5, duration: 1200 },
  },
  {
    id: 'me-9', type: 'COMMIT_CREATED', improvementCaseId: 'imp-1', sessionId: 'sess-1',
    timestamp: '2026-09-30T09:42:00Z', evolutionStage: 'implement',
    payload: { type: 'COMMIT_CREATED', ref: 'a1b2c3d', message: 'feat: add methodology types' },
  },
  {
    id: 'me-10', type: 'FORAGE_CAPTURED', improvementCaseId: 'imp-1', sessionId: 'sess-1',
    timestamp: '2026-09-30T09:43:00Z', evolutionStage: 'implement',
    payload: { type: 'FORAGE_CAPTURED', entryId: 'GE-20260930-abc', title: 'PushMixin reconnect requires explicit re-fetch' },
  },
];

export const sampleAgentImprovementView: AgentImprovementView = {
  stream: {
    improvementCaseId: 'imp-1',
    category: 'coverage-gap',
    target: 'components/agent-detail',
    currentStage: 'implement',
    blockedBy: null,
    conflictBlocked: false,
    startedAt: '2026-09-30T09:00:00Z',
  },
  sessionId: 'sess-1',
  methodology: sampleMethodologyMetadata,
};
