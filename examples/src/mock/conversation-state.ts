import type { ConversationState } from '../../../components/conversation-viewer/src/types.js';

export const MOCK_CONVERSATION_STATE: ConversationState = {
  currentRound: 3,
  convergence: { state: 'CONVERGING', confidence: 0.72, reason: 'Agreement reached on auth scoping and error model. Cache TTL remains disputed.' },
  commonGround: {
    facts: [
      { id: 'f1', topic: 'Auth scoping', content: 'JWT tokens must be scoped to tenant boundaries using the sub claim', epistemicStatus: 'ESTABLISHED', acknowledgedBy: ['REV', 'IMP', 'SUP'], disputedBy: [], round: 2 },
      { id: 'f2', topic: 'Error model', content: 'Use RFC 7807 Problem Details for all API error responses', epistemicStatus: 'ESTABLISHED', acknowledgedBy: ['REV', 'IMP'], disputedBy: [], round: 1 },
      { id: 'f3', topic: 'Rate limits', content: 'Per-endpoint rate limits are needed but specific thresholds are TBD', epistemicStatus: 'PENDING', acknowledgedBy: ['REV'], disputedBy: [], round: 2 },
      { id: 'f4', topic: 'Retry policy', content: 'Exponential backoff with jitter for transient failures', epistemicStatus: 'PENDING', acknowledgedBy: ['IMP'], disputedBy: [], round: 3 },
      { id: 'f5', topic: 'Cache TTL', content: '60-second cache TTL is too long for auth token validation endpoints', epistemicStatus: 'DISPUTED', acknowledgedBy: ['REV'], disputedBy: ['IMP'], round: 3 },
    ],
  },
  points: [
    {
      id: 'p1', topic: 'Auth scoping', round: 1,
      classification: { priority: 'HIGH', scope: 'ARCHITECTURE', location: 'auth/jwt-validator.ts' },
      entries: [
        { entryType: 'RAISE', content: 'The auth module validates JWT tokens but does not enforce tenant scoping. A token from tenant A can access tenant B resources if the endpoint does not explicitly check.', agentRole: 'REV', round: 1, timestamp: '2026-08-01T10:00:00Z' },
        { entryType: 'COUNTER', content: 'The middleware already extracts tenant from the token sub claim. Individual endpoints check req.tenantId which is set by middleware.', agentRole: 'IMP', round: 1, timestamp: '2026-08-01T10:05:00Z' },
        { entryType: 'QUALIFY', content: 'Fair point on middleware extraction, but three endpoints bypass middleware: health, metrics, and the internal admin API. The admin API accesses tenant data.', agentRole: 'REV', round: 2, timestamp: '2026-08-01T11:00:00Z' },
        { entryType: 'AGREE', content: 'Confirmed — the admin API should go through tenant middleware. Will add it.', agentRole: 'IMP', round: 2, timestamp: '2026-08-01T11:10:00Z' },
      ],
      status: 'AGREED',
    },
    {
      id: 'p2', topic: 'Error model consistency', round: 1,
      classification: { priority: 'MEDIUM', scope: 'API' },
      entries: [
        { entryType: 'RAISE', content: 'API returns inconsistent error shapes — some endpoints use {error: string}, others use {message: string, code: number}. Should standardise on RFC 7807.', agentRole: 'REV', round: 1, timestamp: '2026-08-01T10:15:00Z' },
        { entryType: 'AGREE', content: 'Agreed. RFC 7807 Problem Details is the right choice. Will create a shared error factory.', agentRole: 'IMP', round: 1, timestamp: '2026-08-01T10:20:00Z' },
      ],
      status: 'AGREED',
    },
    {
      id: 'p3', topic: 'Cache TTL for auth endpoints', round: 2,
      classification: { priority: 'HIGH', scope: 'PERFORMANCE', location: 'cache/config.ts' },
      entries: [
        { entryType: 'RAISE', content: 'Token validation responses are cached for 60 seconds. If a token is revoked, the revocation takes up to 60 seconds to take effect. This is a security concern.', agentRole: 'REV', round: 2, timestamp: '2026-08-01T11:30:00Z' },
        { entryType: 'DISPUTE', content: 'Reducing cache TTL to 0 would increase latency 3x on every authenticated request. The 60s window is an acceptable trade-off for the performance gain.', agentRole: 'IMP', round: 2, timestamp: '2026-08-01T11:35:00Z' },
        { entryType: 'QUALIFY', content: 'A revocation event could push-invalidate the cache entry instead of waiting for TTL expiry. This gives both security and performance.', agentRole: 'REV', round: 3, timestamp: '2026-08-01T12:00:00Z' },
      ],
      status: 'DISPUTED',
    },
    {
      id: 'p4', topic: 'Rate limit thresholds', round: 2,
      classification: { priority: 'MEDIUM', scope: 'API', location: 'middleware/rate-limiter.ts' },
      entries: [
        { entryType: 'RAISE', content: 'No rate limits are configured on any endpoint. A single client can exhaust the server by sending unlimited requests.', agentRole: 'REV', round: 2, timestamp: '2026-08-01T11:40:00Z' },
        { entryType: 'AGREE', content: 'Rate limiting is needed. Proposing 100 req/min for read endpoints, 20 req/min for write endpoints.', agentRole: 'IMP', round: 2, timestamp: '2026-08-01T11:45:00Z' },
      ],
      status: 'ACTIVE',
    },
    {
      id: 'p5', topic: 'Retry configuration', round: 3,
      classification: { priority: 'LOW', scope: 'RESILIENCE' },
      entries: [
        { entryType: 'RAISE', content: 'Client retries use fixed 1-second intervals. This causes thundering herd on transient failures.', agentRole: 'REV', round: 3, timestamp: '2026-08-01T12:10:00Z' },
      ],
      status: 'OPEN',
    },
  ],
  subTaskFindings: [
    { id: 'st1', pointId: 'p1', taskType: 'VERIFY', content: 'Confirmed: admin API at /internal/admin/* bypasses tenant middleware. curl request with tenant-A token returns tenant-B data.', status: 'CONFIRMED', round: 2 },
    { id: 'st2', pointId: 'p3', taskType: 'VERIFY', content: 'Measured cache hit rate: 94% of auth requests served from cache. Removing cache increases p99 latency from 12ms to 45ms.', status: 'CONFIRMED', round: 3 },
  ],
  humanFlags: [
    { id: 'fl1', pointId: 'p3', content: 'Security team needs to sign off on any cache TTL > 0 for auth token validation', flaggedBy: 'HUMAN', round: 3 },
  ],
  memos: [
    { agentRole: 'REV', content: 'Focus areas: auth scoping resolved, cache TTL needs security sign-off, rate limits agreed in principle', round: 3 },
  ],
  obligations: [
    {
      pointId: 'p1', correlationId: 'obl-p1-fix',
      commitment: { state: 'FULFILLED', createdAt: '2026-08-01T11:10:00Z', updatedAt: '2026-08-01T11:30:00Z', resolvedAt: '2026-08-01T11:30:00Z' },
      transitions: [
        { from: 'OPEN', to: 'ACKNOWLEDGED', actor: 'IMP', timestamp: '2026-08-01T11:10:00Z' },
        { from: 'ACKNOWLEDGED', to: 'FULFILLED', actor: 'IMP', timestamp: '2026-08-01T11:30:00Z' },
      ],
    },
    {
      pointId: 'p4', correlationId: 'obl-p4-impl',
      commitment: { state: 'ACKNOWLEDGED', createdAt: '2026-08-01T11:45:00Z', updatedAt: '2026-08-01T11:45:00Z', acknowledgedAt: '2026-08-01T11:45:00Z' },
      transitions: [
        { from: 'OPEN', to: 'ACKNOWLEDGED', actor: 'IMP', timestamp: '2026-08-01T11:45:00Z' },
      ],
    },
  ],
};
