import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sampleAgentImprovementView, sampleMethodologyEvents } from './sample-data.js';
import { SAFE_ACTIONS } from './types.js';
import type { AgentDetailProps } from './types.js';

describe('blocks-agent-detail', () => {
  beforeEach(async () => {
    await import('./agent-detail.js');
  });

  async function create(props: Partial<AgentDetailProps> = {}): Promise<HTMLElement> {
    const el = document.createElement('blocks-agent-detail');
    if (props.data !== undefined) (el as any).data = props.data;
    if (props.events !== undefined) (el as any).events = props.events;
    if (props.controlConfig !== undefined) (el as any).controlConfig = props.controlConfig;
    if (props.endpoint !== undefined) (el as any).endpoint = props.endpoint;
    if (props.caseId !== undefined) (el as any).caseId = props.caseId;
    if (props.tenancyId !== undefined) (el as any).tenancyId = props.tenancyId;
    if (props.improvementCaseId !== undefined) (el as any).improvementCaseId = props.improvementCaseId;
    if (props.sessionId !== undefined) (el as any).sessionId = props.sessionId;
    document.body.appendChild(el);
    await (el as any).updateComplete;
    return el;
  }

  function cleanup(el: HTMLElement): void {
    el.remove();
  }

  it('renders with inline data', async () => {
    const el = await create({
      data: sampleAgentImprovementView,
      events: sampleMethodologyEvents,
    });
    expect(el).toBeDefined();
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toContain('imp-1');
    cleanup(el);
  });

  it('shows only safe actions by default', async () => {
    const el = await create({ data: sampleAgentImprovementView });
    const buttons = el.shadowRoot!.querySelectorAll('.control-bar button');
    const labels = Array.from(buttons).map(b => b.getAttribute('aria-label'));
    expect(labels).toContain('Pause');
    expect(labels).toContain('Resume');
    expect(labels).not.toContain('Terminate');
    expect(labels).not.toContain('Force transition');
    cleanup(el);
  });

  it('shows destructive actions when configured', async () => {
    const el = await create({
      data: sampleAgentImprovementView,
      controlConfig: { allowedActions: ['PAUSE', 'RESUME', 'TERMINATE'] },
    });
    const buttons = el.shadowRoot!.querySelectorAll('.control-bar button');
    const labels = Array.from(buttons).map(b => b.getAttribute('aria-label'));
    expect(labels).toContain('Terminate');
    cleanup(el);
  });

  it('methodology indicator shows active skill', async () => {
    const el = await create({ data: sampleAgentImprovementView });
    const indicator = el.shadowRoot!.querySelector('[role="status"]');
    expect(indicator?.textContent).toContain('test-driven-development');
    cleanup(el);
  });

  it('methodology indicator shows Idle when no skill active', async () => {
    const view = {
      ...sampleAgentImprovementView,
      methodology: { ...sampleAgentImprovementView.methodology!, activeSkill: null, currentArtifact: null },
    };
    const el = await create({ data: view });
    const indicator = el.shadowRoot!.querySelector('[role="status"]');
    expect(indicator?.textContent).toContain('Idle');
    cleanup(el);
  });

  it('configure() sets properties', async () => {
    const el = await create();
    (el as any).configure({ endpoint: 'http://test', caseId: 'c1' });
    expect((el as any).endpoint).toBe('http://test');
    expect((el as any).caseId).toBe('c1');
    cleanup(el);
  });

  it('_renderSession returns session-detail when endpoint is set', async () => {
    const el = await create({
      data: sampleAgentImprovementView,
      sessionId: 'sess-1',
      endpoint: 'http://test',
    });
    const result = (el as any)._renderSession();
    const strings = result?.strings?.join('') ?? '';
    expect(strings).toContain('blocks-session-detail');
    cleanup(el);
  });

  it('_renderSession returns placeholder when no endpoint is set', async () => {
    const el = await create({
      data: sampleAgentImprovementView,
      sessionId: 'sess-1',
    });
    const result = (el as any)._renderSession();
    const strings = result?.strings?.join('') ?? '';
    expect(strings).toContain('connect an endpoint');
    cleanup(el);
  });

  it('renders without data (empty state)', async () => {
    const el = await create();
    expect(el.shadowRoot!.textContent).toContain('No agent selected');
    cleanup(el);
  });
});
