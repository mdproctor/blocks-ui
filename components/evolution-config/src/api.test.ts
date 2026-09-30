import { describe, it, expect, vi } from 'vitest';
import { EvolutionApi } from './api.js';
import type { DenyPatternView, GatePolicy } from './types.js';

function mockFetch(response: unknown, status = 200): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(response),
  }) as unknown as typeof fetch;
}

describe('EvolutionApi', () => {
  it('getDenyPatterns sends GET with caseId and tenancyId', async () => {
    const view: DenyPatternView = { staticPatterns: ['Foo'], dynamicPatterns: [] };
    const fn = mockFetch(view);
    const api = new EvolutionApi('/api/evolution', fn);
    const result = await api.getDenyPatterns('case-1', 'tenant-1');
    expect(result).toEqual(view);
    expect(fn).toHaveBeenCalledWith(
      expect.stringContaining('/getDenyPatterns?caseId=case-1&tenancyId=tenant-1'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('addDenyPattern sends POST with pattern', async () => {
    const fn = mockFetch(undefined);
    const api = new EvolutionApi('/api/evolution', fn);
    await api.addDenyPattern('case-1', 'tenant-1', 'SomeClass');
    expect(fn).toHaveBeenCalledWith(
      expect.stringContaining('/addDenyPattern'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ caseId: 'case-1', tenancyId: 'tenant-1', pattern: 'SomeClass' }),
      }),
    );
  });

  it('removeDenyPattern sends POST', async () => {
    const fn = mockFetch(undefined);
    const api = new EvolutionApi('/api/evolution', fn);
    await api.removeDenyPattern('case-1', 'tenant-1', 'SomeClass');
    expect(fn).toHaveBeenCalledWith(
      expect.stringContaining('/removeDenyPattern'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('addWatchPattern spreads input fields', async () => {
    const fn = mockFetch(undefined);
    const api = new EvolutionApi('/api/evolution', fn);
    await api.addWatchPattern('case-1', 'tenant-1', {
      category: 'lint-fix', targetPattern: '*.java',
    });
    const body = JSON.parse((fn as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.category).toBe('lint-fix');
    expect(body.targetPattern).toBe('*.java');
    expect(body.caseId).toBe('case-1');
  });

  it('resolveGate sends GateOutcome not InboxEntryStatus', async () => {
    const fn = mockFetch(undefined);
    const api = new EvolutionApi('/api/evolution', fn);
    await api.resolveGate('case-1', 'tenant-1', 'entry-1', 'APPROVED', 'looks good');
    const body = JSON.parse((fn as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.outcome).toBe('APPROVED');
    expect(body.reason).toBe('looks good');
  });

  it('setGatePolicy sends full GatePolicy object', async () => {
    const fn = mockFetch(undefined);
    const api = new EvolutionApi('/api/evolution', fn);
    const policy: GatePolicy = { modes: { 'pr-review': 'GATED' }, gateTimeoutMinutes: 720 };
    await api.setGatePolicy('case-1', 'tenant-1', policy);
    const body = JSON.parse((fn as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.policy).toEqual(policy);
  });

  it('getGatePolicy sends GET', async () => {
    const policy: GatePolicy = { modes: { 'pr-review': 'GATED' }, gateTimeoutMinutes: null };
    const fn = mockFetch(policy);
    const api = new EvolutionApi('/api/evolution', fn);
    const result = await api.getGatePolicy('case-1', 'tenant-1');
    expect(result).toEqual(policy);
  });

  it('resetCircuitBreaker sends POST', async () => {
    const fn = mockFetch(undefined);
    const api = new EvolutionApi('/api/evolution', fn);
    await api.resetCircuitBreaker('case-1');
    expect(fn).toHaveBeenCalledWith(
      expect.stringContaining('/resetCircuitBreaker'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws on non-OK response', async () => {
    const fn = mockFetch(undefined, 500);
    const api = new EvolutionApi('/api/evolution', fn);
    await expect(api.getDenyPatterns('c', 't')).rejects.toThrow('500');
  });

  it('encodes tenancyId in query params', async () => {
    const fn = mockFetch({ staticPatterns: [], dynamicPatterns: [] });
    const api = new EvolutionApi('/api/evolution', fn);
    await api.getDenyPatterns('case-1', 'tenant/with spaces');
    expect(fn).toHaveBeenCalledWith(
      expect.stringContaining('tenancyId=tenant%2Fwith%20spaces'),
      expect.any(Object),
    );
  });

  describe('methodology API', () => {
    it('getMethodologyMetadata sends GET with improvementCaseId', async () => {
      const meta = { activeSkill: 'brainstorming', currentArtifact: 'spec', startedAt: '2026-09-30T00:00:00Z', updatedAt: '2026-09-30T00:05:00Z' };
      const fn = mockFetch(meta);
      const api = new EvolutionApi('/api/evolution', fn);
      const result = await api.getMethodologyMetadata('c1', 't1', 'imp1');
      expect(fn).toHaveBeenCalledWith(
        expect.stringContaining('/getMethodologyMetadata?caseId=c1&tenancyId=t1&improvementCaseId=imp1'),
        expect.objectContaining({ method: 'GET' }),
      );
      expect(result).toEqual(meta);
    });

    it('getMethodologyBatch sends GET without improvementCaseId', async () => {
      const batch = { 'imp-1': { activeSkill: 'tdd', currentArtifact: 'test', startedAt: '2026-09-30T00:00:00Z', updatedAt: '2026-09-30T00:05:00Z' } };
      const fn = mockFetch(batch);
      const api = new EvolutionApi('/api/evolution', fn);
      const result = await api.getMethodologyBatch('c1', 't1');
      expect(fn).toHaveBeenCalledWith(
        expect.stringContaining('/getMethodologyBatch?caseId=c1&tenancyId=t1'),
        expect.objectContaining({ method: 'GET' }),
      );
      expect(result).toEqual(batch);
    });

    it('getMethodologyEvents sends GET with optional params', async () => {
      const fn = mockFetch([]);
      const api = new EvolutionApi('/api/evolution', fn);
      await api.getMethodologyEvents('c1', 't1', 'imp1', { since: '2026-09-30T00:00:00Z', limit: 50 });
      expect(fn).toHaveBeenCalledWith(
        expect.stringContaining('&since=2026-09-30T00%3A00%3A00Z&limit=50'),
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('pauseAgent sends POST with reason', async () => {
      const fn = mockFetch(undefined);
      const api = new EvolutionApi('/api/evolution', fn);
      await api.pauseAgent('c1', 't1', 'imp1', 'testing');
      expect(fn).toHaveBeenCalledWith(
        expect.stringContaining('/pauseAgent'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ caseId: 'c1', tenancyId: 't1', improvementCaseId: 'imp1', reason: 'testing' }),
        }),
      );
    });

    it('resumeAgent sends POST', async () => {
      const fn = mockFetch(undefined);
      const api = new EvolutionApi('/api/evolution', fn);
      await api.resumeAgent('c1', 't1', 'imp1');
      expect(fn).toHaveBeenCalledWith(
        expect.stringContaining('/resumeAgent'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('sendInstruction sends POST with instruction', async () => {
      const fn = mockFetch(undefined);
      const api = new EvolutionApi('/api/evolution', fn);
      await api.sendInstruction('c1', 't1', 'imp1', 'work start #42');
      const body = JSON.parse((fn as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
      expect(body.instruction).toBe('work start #42');
    });

    it('forceTransition sends POST with gate override reason', async () => {
      const fn = mockFetch(undefined);
      const api = new EvolutionApi('/api/evolution', fn);
      await api.forceTransition('c1', 't1', 'imp1', 'pr-review', 'emergency fix');
      const body = JSON.parse((fn as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
      expect(body.targetStage).toBe('pr-review');
      expect(body.gateOverrideReason).toBe('emergency fix');
    });

    it('reassignAgent sends POST with target', async () => {
      const fn = mockFetch(undefined);
      const api = new EvolutionApi('/api/evolution', fn);
      await api.reassignAgent('c1', 't1', 'imp1', 'imp2');
      const body = JSON.parse((fn as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
      expect(body.targetImprovementCaseId).toBe('imp2');
    });

    it('terminateAgent sends POST with reason', async () => {
      const fn = mockFetch(undefined);
      const api = new EvolutionApi('/api/evolution', fn);
      await api.terminateAgent('c1', 't1', 'imp1', 'no longer needed');
      const body = JSON.parse((fn as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
      expect(body.reason).toBe('no longer needed');
    });
  });
});
