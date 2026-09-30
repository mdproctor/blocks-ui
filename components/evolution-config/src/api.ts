import type {
  DenyPatternView, WatchPattern, WatchPatternInput, GatePolicy,
  GateOutcome, StageDescriptor, CategoryDescriptor,
  EvolutionStateSnapshot, ImprovementStreamView, ConductorInboxEntry,
  MethodologyMetadata, MethodologyEvent,
} from './types.js';

function enc(s: string): string { return encodeURIComponent(s); }

export class EvolutionApi {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async getDenyPatterns(caseId: string, tenancyId: string): Promise<DenyPatternView> {
    return this._get(`${this.baseUrl}/getDenyPatterns?caseId=${caseId}&tenancyId=${enc(tenancyId)}`);
  }

  async addDenyPattern(caseId: string, tenancyId: string, pattern: string): Promise<void> {
    await this._post(`${this.baseUrl}/addDenyPattern`, { caseId, tenancyId, pattern });
  }

  async removeDenyPattern(caseId: string, tenancyId: string, pattern: string): Promise<void> {
    await this._post(`${this.baseUrl}/removeDenyPattern`, { caseId, tenancyId, pattern });
  }

  async getWatchPatterns(caseId: string, tenancyId: string): Promise<WatchPattern[]> {
    return this._get(`${this.baseUrl}/getWatchPatterns?caseId=${caseId}&tenancyId=${enc(tenancyId)}`);
  }

  async addWatchPattern(caseId: string, tenancyId: string, input: WatchPatternInput): Promise<void> {
    await this._post(`${this.baseUrl}/addWatchPattern`, { caseId, tenancyId, ...input });
  }

  async removeWatchPattern(caseId: string, tenancyId: string, patternId: string): Promise<void> {
    await this._post(`${this.baseUrl}/removeWatchPattern`, { caseId, tenancyId, patternId });
  }

  async getGatePolicy(caseId: string, tenancyId: string): Promise<GatePolicy> {
    return this._get(`${this.baseUrl}/getGatePolicy?caseId=${caseId}&tenancyId=${enc(tenancyId)}`);
  }

  async setGatePolicy(caseId: string, tenancyId: string, policy: GatePolicy): Promise<void> {
    await this._post(`${this.baseUrl}/setGatePolicy`, { caseId, tenancyId, policy });
  }

  async getStages(caseId: string): Promise<StageDescriptor[]> {
    return this._get(`${this.baseUrl}/getStages?caseId=${caseId}`);
  }

  async getCategories(caseId: string): Promise<CategoryDescriptor[]> {
    return this._get(`${this.baseUrl}/getCategories?caseId=${caseId}`);
  }

  async getEvolutionState(caseId: string, tenancyId: string): Promise<EvolutionStateSnapshot> {
    return this._get(`${this.baseUrl}/getEvolutionState?caseId=${caseId}&tenancyId=${enc(tenancyId)}`);
  }

  async getStreamProgress(caseId: string, tenancyId: string): Promise<ImprovementStreamView[]> {
    return this._get(`${this.baseUrl}/getStreamProgress?caseId=${caseId}&tenancyId=${enc(tenancyId)}`);
  }

  async getInbox(caseId: string, tenancyId: string): Promise<ConductorInboxEntry[]> {
    return this._get(`${this.baseUrl}/getInbox?caseId=${caseId}&tenancyId=${enc(tenancyId)}`);
  }

  async resolveGate(caseId: string, tenancyId: string, entryId: string,
      outcome: GateOutcome, reason?: string, feedback?: string): Promise<void> {
    await this._post(`${this.baseUrl}/resolveGate`, {
      caseId, tenancyId, entryId, outcome, reason, feedback,
    });
  }

  async pauseCategory(caseId: string, tenancyId: string,
      category: string, durationMinutes: number): Promise<void> {
    await this._post(`${this.baseUrl}/pauseCategory`, {
      caseId, tenancyId, category, durationMinutes,
    });
  }

  async unpauseCategory(caseId: string, tenancyId: string, category: string): Promise<void> {
    await this._post(`${this.baseUrl}/unpauseCategory`, { caseId, tenancyId, category });
  }

  async blockImprovement(caseId: string, tenancyId: string,
      improvementId: string, blockedBy: string): Promise<void> {
    await this._post(`${this.baseUrl}/blockImprovement`, {
      caseId, tenancyId, improvementId, blockedBy,
    });
  }

  async unblockImprovement(caseId: string, tenancyId: string,
      improvementId: string): Promise<void> {
    await this._post(`${this.baseUrl}/unblockImprovement`, {
      caseId, tenancyId, improvementId,
    });
  }

  async resetCircuitBreaker(caseId: string): Promise<void> {
    await this._post(`${this.baseUrl}/resetCircuitBreaker`, { caseId });
  }

  async getMethodologyMetadata(caseId: string, tenancyId: string, improvementCaseId: string): Promise<MethodologyMetadata | null> {
    return this._get<MethodologyMetadata | null>(`${this.baseUrl}/getMethodologyMetadata?caseId=${enc(caseId)}&tenancyId=${enc(tenancyId)}&improvementCaseId=${enc(improvementCaseId)}`);
  }

  async getMethodologyBatch(caseId: string, tenancyId: string): Promise<Record<string, MethodologyMetadata | null>> {
    return this._get<Record<string, MethodologyMetadata | null>>(`${this.baseUrl}/getMethodologyBatch?caseId=${enc(caseId)}&tenancyId=${enc(tenancyId)}`);
  }

  async getMethodologyEvents(caseId: string, tenancyId: string, improvementCaseId: string, params?: { since?: string; limit?: number }): Promise<MethodologyEvent[]> {
    let url = `${this.baseUrl}/getMethodologyEvents?caseId=${enc(caseId)}&tenancyId=${enc(tenancyId)}&improvementCaseId=${enc(improvementCaseId)}`;
    if (params?.since) url += `&since=${enc(params.since)}`;
    if (params?.limit != null) url += `&limit=${params.limit}`;
    return this._get<MethodologyEvent[]>(url);
  }

  async pauseAgent(caseId: string, tenancyId: string, improvementCaseId: string, reason?: string): Promise<void> {
    await this._post(`${this.baseUrl}/pauseAgent`, { caseId, tenancyId, improvementCaseId, reason });
  }

  async resumeAgent(caseId: string, tenancyId: string, improvementCaseId: string): Promise<void> {
    await this._post(`${this.baseUrl}/resumeAgent`, { caseId, tenancyId, improvementCaseId });
  }

  async sendInstruction(caseId: string, tenancyId: string, improvementCaseId: string, instruction: string): Promise<void> {
    await this._post(`${this.baseUrl}/sendInstruction`, { caseId, tenancyId, improvementCaseId, instruction });
  }

  async forceTransition(caseId: string, tenancyId: string, improvementCaseId: string, targetStage: string, gateOverrideReason?: string): Promise<void> {
    await this._post(`${this.baseUrl}/forceTransition`, { caseId, tenancyId, improvementCaseId, targetStage, gateOverrideReason });
  }

  async reassignAgent(caseId: string, tenancyId: string, improvementCaseId: string, targetImprovementCaseId: string): Promise<void> {
    await this._post(`${this.baseUrl}/reassignAgent`, { caseId, tenancyId, improvementCaseId, targetImprovementCaseId });
  }

  async terminateAgent(caseId: string, tenancyId: string, improvementCaseId: string, reason?: string): Promise<void> {
    await this._post(`${this.baseUrl}/terminateAgent`, { caseId, tenancyId, improvementCaseId, reason });
  }

  private async _get<T>(url: string): Promise<T> {
    const res = await this.fetchFn(url, {
      method: 'GET', headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
    return res.json();
  }

  private async _post(url: string, body: unknown): Promise<void> {
    const res = await this.fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
  }
}
