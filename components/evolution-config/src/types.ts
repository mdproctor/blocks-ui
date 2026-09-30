export interface DynamicDenyEntry {
  readonly pattern: string;
  readonly addedBy: string;
  readonly addedAt: string;
}

export interface DenyPatternView {
  readonly staticPatterns: readonly string[];
  readonly dynamicPatterns: readonly DynamicDenyEntry[];
}

export interface WatchPattern {
  readonly id: string;
  readonly category: string | null;
  readonly areaId: string | null;
  readonly targetPattern: string | null;
  readonly minEstimatedSize: number | null;
  readonly createdAt: string;
}

export type GateMode = 'GATED' | 'AUTO' | 'NOTIFY';
export type GateOutcome = 'APPROVED' | 'REJECTED';

export interface GatePolicy {
  readonly modes: Record<string, GateMode> | null;
  readonly gateTimeoutMinutes: number | null;
}

export interface CategoryDescriptor {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly domainId: string;
}

export interface StageDescriptor {
  readonly id: string;
  readonly name: string;
  readonly ordinal: number;
  readonly gateCheckpoint: boolean;
  readonly domainId: string;
}

export type InboxEntryStatus =
  | 'PENDING' | 'APPROVED' | 'REJECTED'
  | 'REDIRECTED' | 'TIMED_OUT' | 'AUTO_APPROVED';

export interface EscalationTrigger {
  readonly layer: 'CATEGORY_RULE' | 'WATCH_PATTERN' | 'CONFIDENCE_SCORE';
  readonly reason: string;
}

export interface ConductorDecision {
  readonly outcome: InboxEntryStatus;
  readonly reason: string | null;
  readonly feedback: string | null;
}

export interface ConductorInboxEntry {
  readonly caseId: string;
  readonly id: string;
  readonly stage: string;
  readonly status: InboxEntryStatus;
  readonly category: string | null;
  readonly areaId: string | null;
  readonly improvementCaseId: string | null;
  readonly summary: string | null;
  readonly escalationTriggers: readonly EscalationTrigger[];
  readonly confidence: number;
  readonly queuedAt: string;
  readonly resolvedAt: string | null;
  readonly timeoutMinutes: number | null;
  readonly decision: ConductorDecision | null;
}

export interface CategoryStateView {
  readonly successCount: number;
  readonly failureCount: number;
  readonly rejectionCount: number;
  readonly paused: boolean;
  readonly pausedUntil: string | null;
  readonly suppressed: boolean;
}

export interface EvolutionStateSnapshot {
  readonly caseId: string;
  readonly timestamp: string;
  readonly healthScore: number;
  readonly componentScores: Record<string, number>;
  readonly healthDelta: number;
  readonly healthWindowMinutes: number;
  readonly circuitBreakerState: string;
  readonly categoryStates: Record<string, CategoryStateView>;
  readonly projectComplianceLevel: string;
  readonly complianceEvaluatedAt: string | null;
  readonly areaComplianceLevels: Record<string, string>;
  readonly activeImprovementCount: number;
  readonly dailyImprovementCount: number;
  readonly evolutionEnabled: boolean;
  readonly pendingInboxCount: number;
}

export interface ImprovementStreamView {
  readonly improvementCaseId: string;
  readonly category: string;
  readonly target: string | null;
  readonly currentStage: string;
  readonly blockedBy: string | null;
  readonly conflictBlocked: boolean;
  readonly startedAt: string;
}

export interface WatchPatternInput {
  readonly category?: string;
  readonly areaId?: string;
  readonly targetPattern?: string;
  readonly minEstimatedSize?: number;
}

export interface MethodologyMetadata {
  readonly activeSkill: string | null;
  readonly currentArtifact: string | null;
  readonly startedAt: string;
  readonly updatedAt: string;
}

export type MethodologyEventType =
  | 'SKILL_STARTED' | 'SKILL_COMPLETED' | 'SKILL_FAILED'
  | 'ARTIFACT_CREATED' | 'ARTIFACT_UPDATED'
  | 'FORAGE_CAPTURED' | 'GARDEN_ENTRY_CREATED'
  | 'TEST_PASSED' | 'TEST_FAILED'
  | 'COMMIT_CREATED' | 'PR_SUBMITTED';

export interface MethodologyEvent {
  readonly id: string;
  readonly type: MethodologyEventType;
  readonly improvementCaseId: string;
  readonly sessionId: string;
  readonly timestamp: string;
  readonly evolutionStage: string;
  readonly payload: MethodologyEventPayload;
}

export interface SkillEventPayload {
  readonly type: 'SKILL_STARTED' | 'SKILL_COMPLETED' | 'SKILL_FAILED';
  readonly skillName: string;
  readonly duration?: number;
  readonly error?: string;
}

export interface ArtifactEventPayload {
  readonly type: 'ARTIFACT_CREATED' | 'ARTIFACT_UPDATED';
  readonly artifactType: string;
  readonly path?: string;
}

export interface KnowledgeEventPayload {
  readonly type: 'FORAGE_CAPTURED' | 'GARDEN_ENTRY_CREATED';
  readonly entryId: string;
  readonly title: string;
}

export interface TestEventPayload {
  readonly type: 'TEST_PASSED' | 'TEST_FAILED';
  readonly testCount: number;
  readonly failedCount?: number;
  readonly duration?: number;
}

export interface CommitEventPayload {
  readonly type: 'COMMIT_CREATED' | 'PR_SUBMITTED';
  readonly ref: string;
  readonly message?: string;
}

export type MethodologyEventPayload =
  | SkillEventPayload
  | ArtifactEventPayload
  | KnowledgeEventPayload
  | TestEventPayload
  | CommitEventPayload;
