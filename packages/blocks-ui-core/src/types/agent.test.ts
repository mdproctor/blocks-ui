import { describe, it, expect } from 'vitest';
import { primaryTerm, DISPOSITION_AXES } from './agent.js';
import type { AgentDisposition, FullAgentDescriptor } from './agent.js';

describe('primaryTerm', () => {
  it('returns highest-weight term', () => {
    const disposition: AgentDisposition = {
      socialOrient: [
        { term: 'collaborative', weight: 0.7 },
        { term: 'independent', weight: 0.3 },
      ],
    };
    expect(primaryTerm(disposition, 'socialOrient')).toEqual({ term: 'collaborative', weight: 0.7 });
  });

  it('returns undefined for missing axis', () => {
    const disposition: AgentDisposition = {};
    expect(primaryTerm(disposition, 'autonomy')).toBeUndefined();
  });

  it('returns undefined for undefined disposition', () => {
    expect(primaryTerm(undefined, 'autonomy')).toBeUndefined();
  });

  it('returns single term when only one', () => {
    const disposition: AgentDisposition = {
      riskAppetite: [{ term: 'cautious', weight: 1.0 }],
    };
    expect(primaryTerm(disposition, 'riskAppetite')?.term).toBe('cautious');
  });
});

describe('DISPOSITION_AXES', () => {
  it('has exactly 5 axes', () => {
    expect(DISPOSITION_AXES).toHaveLength(5);
  });
});

describe('FullAgentDescriptor type', () => {
  it('accepts a complete descriptor', () => {
    const desc: FullAgentDescriptor = {
      agentId: 'support-01',
      name: 'Customer Support Agent',
      tenancyId: 'tenant-1',
      version: '1.0',
      provider: 'anthropic',
      modelFamily: 'claude',
      modelVersion: 'claude-sonnet-5',
      slot: 'supporter',
      capabilities: [{ name: 'issue-resolution' }],
      disposition: {
        socialOrient: [{ term: 'collaborative', weight: 1.0 }],
        delegation: true,
      },
      goals: [{ name: 'resolve-quickly', priority: 'PRIMARY' }],
      constraints: [{ name: 'hipaa', severity: 'HARD' }],
      briefing: 'You are a customer support agent.',
    };
    expect(desc.agentId).toBe('support-01');
    expect(desc.disposition?.delegation).toBe(true);
  });
});
