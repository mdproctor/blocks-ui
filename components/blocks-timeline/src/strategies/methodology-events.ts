import { html } from 'lit';
import type { EventTimelineNode, EventNodeStatus } from '@casehubio/pages-viz';
import type { EventTimelineStrategy } from '@casehubio/pages-viz';
import type {
  MethodologyEvent, MethodologyEventType, MethodologyEventPayload,
} from '@casehubio/blocks-ui-evolution-config';

const FILTER_MAP: Record<MethodologyEventType, string> = {
  SKILL_STARTED: 'skill', SKILL_COMPLETED: 'skill', SKILL_FAILED: 'skill',
  ARTIFACT_CREATED: 'artifact', ARTIFACT_UPDATED: 'artifact',
  FORAGE_CAPTURED: 'knowledge', GARDEN_ENTRY_CREATED: 'knowledge',
  TEST_PASSED: 'test', TEST_FAILED: 'test',
  COMMIT_CREATED: 'commit', PR_SUBMITTED: 'commit',
};

export function methodologyFilterCategory(eventType: MethodologyEventType): string {
  return FILTER_MAP[eventType] ?? 'skill';
}

function nodeLabel(payload: MethodologyEventPayload): string {
  switch (payload.type) {
    case 'SKILL_STARTED': return `Started: ${payload.skillName}`;
    case 'SKILL_COMPLETED': return `Completed: ${payload.skillName}`;
    case 'SKILL_FAILED': return `Failed: ${payload.skillName}`;
    case 'ARTIFACT_CREATED': return `Created: ${payload.artifactType}`;
    case 'ARTIFACT_UPDATED': return `Updated: ${payload.artifactType}`;
    case 'FORAGE_CAPTURED': return `Captured: ${payload.title}`;
    case 'GARDEN_ENTRY_CREATED': return `Garden: ${payload.title}`;
    case 'TEST_PASSED': return `Tests passed: ${payload.testCount}`;
    case 'TEST_FAILED': return `Tests failed: ${payload.failedCount ?? 0}/${payload.testCount}`;
    case 'COMMIT_CREATED': return `Commit: ${payload.ref.slice(0, 7)}`;
    case 'PR_SUBMITTED': return `PR: #${payload.ref}`;
  }
}

function nodeStatus(payload: MethodologyEventPayload): EventNodeStatus {
  switch (payload.type) {
    case 'SKILL_STARTED': return 'active';
    case 'SKILL_COMPLETED': return 'completed';
    case 'SKILL_FAILED': return 'failed';
    case 'ARTIFACT_CREATED': case 'ARTIFACT_UPDATED': return 'completed';
    case 'FORAGE_CAPTURED': case 'GARDEN_ENTRY_CREATED': return 'completed';
    case 'TEST_PASSED': return 'completed';
    case 'TEST_FAILED': return 'failed';
    case 'COMMIT_CREATED': case 'PR_SUBMITTED': return 'completed';
  }
}

function toNode(event: MethodologyEvent): EventTimelineNode {
  return {
    key: event.id,
    label: nodeLabel(event.payload),
    status: nodeStatus(event.payload),
    timestamp: event.timestamp,
    detail: event.payload,
    category: methodologyFilterCategory(event.type),
  };
}

function renderDetail(node: EventTimelineNode) {
  const payload = node.detail as MethodologyEventPayload;
  if (!payload) return html``;

  switch (payload.type) {
    case 'SKILL_STARTED':
    case 'SKILL_COMPLETED':
      return html`<div style="font-size:12px;color:var(--pages-neutral-11,#333)">Skill: <span style="display:inline-block;padding:2px 6px;border-radius:3px;font-size:11px;font-weight:500;background:var(--pages-accent-3,#dbeafe);color:var(--pages-accent-11,#1e40af)">${payload.skillName}</span>${payload.duration != null ? html` | ${Math.round(payload.duration / 1000)}s` : ''}</div>`;
    case 'SKILL_FAILED':
      return html`<div style="font-size:12px;color:var(--pages-danger-11,#c00)">Skill: ${payload.skillName}${payload.error ? html` | ${payload.error}` : ''}</div>`;
    case 'ARTIFACT_CREATED':
    case 'ARTIFACT_UPDATED':
      return html`<div style="font-size:12px;color:var(--pages-neutral-11,#333)">${payload.artifactType}${payload.path ? html` | <code style="font-family:var(--pages-font-mono,monospace);font-size:11px">${payload.path}</code>` : ''}</div>`;
    case 'FORAGE_CAPTURED':
    case 'GARDEN_ENTRY_CREATED':
      return html`<div style="font-size:12px;color:var(--pages-neutral-11,#333)">${payload.entryId}: ${payload.title}</div>`;
    case 'TEST_PASSED':
      return html`<div style="font-size:12px;color:var(--pages-success-11,#166534)">${payload.testCount} tests passed${payload.duration != null ? html` in ${payload.duration}ms` : ''}</div>`;
    case 'TEST_FAILED':
      return html`<div style="font-size:12px;color:var(--pages-danger-11,#c00)">${payload.failedCount}/${payload.testCount} failed${payload.duration != null ? html` in ${payload.duration}ms` : ''}</div>`;
    case 'COMMIT_CREATED':
      return html`<div style="font-size:12px;color:var(--pages-neutral-11,#333)"><code style="font-family:var(--pages-font-mono,monospace);font-size:11px">${payload.ref.slice(0, 7)}</code>${payload.message ? html` ${payload.message}` : ''}</div>`;
    case 'PR_SUBMITTED':
      return html`<div style="font-size:12px;color:var(--pages-neutral-11,#333)">PR #${payload.ref}${payload.message ? html` — ${payload.message}` : ''}</div>`;
  }
}

function isPagedResponse(data: unknown): data is { content: MethodologyEvent[] } {
  return data != null && typeof data === 'object' && 'content' in data
    && Array.isArray((data as { content: unknown[] }).content);
}

export const methodologyEventsStrategy: EventTimelineStrategy<MethodologyEvent[]> = {
  toNodes(data: MethodologyEvent[]): EventTimelineNode[] {
    return data.map(toNode);
  },
  transformData(raw: unknown): MethodologyEvent[] {
    if (isPagedResponse(raw)) return raw.content;
    return raw as MethodologyEvent[];
  },
  defaultLayout: 'vertical',
  renderDetail,
  filterCategories: ['skill', 'artifact', 'knowledge', 'test', 'commit', 'conductor'],
  supportsPagination: true,
};
