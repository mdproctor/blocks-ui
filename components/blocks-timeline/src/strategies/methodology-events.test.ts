import { describe, it, expect } from 'vitest';
import type { MethodologyEvent } from '@casehubio/blocks-ui-evolution-config';
import { methodologyEventsStrategy, methodologyFilterCategory } from './methodology-events.js';

const makeEvent = (overrides: Partial<MethodologyEvent> & { type: MethodologyEvent['type']; payload: MethodologyEvent['payload'] }): MethodologyEvent => ({
  id: 'e1',
  improvementCaseId: 'imp-1',
  sessionId: 'sess-1',
  timestamp: '2026-09-30T00:00:00Z',
  evolutionStage: 'implement',
  ...overrides,
});

describe('methodologyEventsStrategy', () => {
  it('maps SKILL_STARTED to active node', () => {
    const event = makeEvent({
      type: 'SKILL_STARTED',
      payload: { type: 'SKILL_STARTED', skillName: 'brainstorming' },
    });
    const nodes = methodologyEventsStrategy.toNodes([event]);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].status).toBe('active');
    expect(nodes[0].label).toContain('brainstorming');
  });

  it('maps SKILL_COMPLETED to completed node', () => {
    const event = makeEvent({
      type: 'SKILL_COMPLETED',
      payload: { type: 'SKILL_COMPLETED', skillName: 'brainstorming', duration: 5000 },
    });
    const nodes = methodologyEventsStrategy.toNodes([event]);
    expect(nodes[0].status).toBe('completed');
  });

  it('maps TEST_FAILED to failed node', () => {
    const event = makeEvent({
      type: 'TEST_FAILED',
      payload: { type: 'TEST_FAILED', testCount: 10, failedCount: 2 },
    });
    const nodes = methodologyEventsStrategy.toNodes([event]);
    expect(nodes[0].status).toBe('failed');
  });

  it('maps FORAGE_CAPTURED to completed node with title', () => {
    const event = makeEvent({
      type: 'FORAGE_CAPTURED',
      payload: { type: 'FORAGE_CAPTURED', entryId: 'GE-123', title: 'PushMixin reconnect gotcha' },
    });
    const nodes = methodologyEventsStrategy.toNodes([event]);
    expect(nodes[0].status).toBe('completed');
    expect(nodes[0].label).toContain('PushMixin reconnect gotcha');
  });

  it('maps COMMIT_CREATED with truncated SHA', () => {
    const event = makeEvent({
      type: 'COMMIT_CREATED',
      payload: { type: 'COMMIT_CREATED', ref: 'a1b2c3d4e5f6', message: 'feat: add types' },
    });
    const nodes = methodologyEventsStrategy.toNodes([event]);
    expect(nodes[0].label).toContain('a1b2c3d');
    expect(nodes[0].label).not.toContain('a1b2c3d4');
  });

  it('filter categories include expected values', () => {
    expect(methodologyEventsStrategy.filterCategories).toEqual(
      ['skill', 'artifact', 'knowledge', 'test', 'commit', 'conductor'],
    );
  });

  it('transforms paged response', () => {
    const event = makeEvent({
      type: 'SKILL_STARTED',
      payload: { type: 'SKILL_STARTED', skillName: 'tdd' },
    });
    const result = methodologyEventsStrategy.transformData!({ content: [event] });
    expect(result).toHaveLength(1);
  });

  it('transforms raw array', () => {
    const event = makeEvent({
      type: 'SKILL_STARTED',
      payload: { type: 'SKILL_STARTED', skillName: 'tdd' },
    });
    const result = methodologyEventsStrategy.transformData!([event]);
    expect(result).toHaveLength(1);
  });

  it('has vertical default layout', () => {
    expect(methodologyEventsStrategy.defaultLayout).toBe('vertical');
  });

  it('supports pagination', () => {
    expect(methodologyEventsStrategy.supportsPagination).toBe(true);
  });
});

describe('methodologyFilterCategory', () => {
  it('maps skill events to skill category', () => {
    expect(methodologyFilterCategory('SKILL_STARTED')).toBe('skill');
    expect(methodologyFilterCategory('SKILL_COMPLETED')).toBe('skill');
    expect(methodologyFilterCategory('SKILL_FAILED')).toBe('skill');
  });

  it('maps artifact events to artifact category', () => {
    expect(methodologyFilterCategory('ARTIFACT_CREATED')).toBe('artifact');
    expect(methodologyFilterCategory('ARTIFACT_UPDATED')).toBe('artifact');
  });

  it('maps knowledge events to knowledge category', () => {
    expect(methodologyFilterCategory('FORAGE_CAPTURED')).toBe('knowledge');
    expect(methodologyFilterCategory('GARDEN_ENTRY_CREATED')).toBe('knowledge');
  });

  it('maps test events to test category', () => {
    expect(methodologyFilterCategory('TEST_PASSED')).toBe('test');
    expect(methodologyFilterCategory('TEST_FAILED')).toBe('test');
  });

  it('maps commit events to commit category', () => {
    expect(methodologyFilterCategory('COMMIT_CREATED')).toBe('commit');
    expect(methodologyFilterCategory('PR_SUBMITTED')).toBe('commit');
  });
});
