import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './agent-profile.js';
import type { FullAgentDescriptor } from '@casehubio/blocks-ui-core';

const SAMPLE_DESCRIPTOR: FullAgentDescriptor = {
  agentId: 'agent-test-01',
  name: 'Test Support Agent',
  tenancyId: 'tenant-1',
  slot: 'supporter',
  provider: 'anthropic',
  modelVersion: 'claude-sonnet-5',
  capabilities: [
    { name: 'issue-resolution' },
    { name: 'ticket-management' },
    { name: 'escalation' },
  ],
  disposition: {
    socialOrient: [{ term: 'collaborative', weight: 1.0 }],
    ruleFollowing: [{ term: 'adaptive', weight: 0.8 }, { term: 'strict', weight: 0.2 }],
    riskAppetite: [{ term: 'cautious', weight: 1.0 }],
    autonomy: [{ term: 'semi-autonomous', weight: 1.0 }],
    conflictMode: [{ term: 'diplomatic', weight: 1.0 }],
    delegation: true,
  },
  goals: [
    { name: 'resolve-quickly', priority: 'PRIMARY' },
    { name: 'customer-satisfaction', priority: 'SECONDARY' },
  ],
  constraints: [
    { name: 'data-privacy', severity: 'HARD' },
    { name: 'response-time', severity: 'SOFT' },
  ],
  briefing: 'You are a customer support specialist focused on resolving issues efficiently.',
};

type ProfileEl = HTMLElement & {
  descriptor?: FullAgentDescriptor;
  updateComplete: Promise<boolean>;
};

describe('agent-profile', () => {
  let el: ProfileEl;

  beforeEach(() => {
    el = document.createElement('agent-profile') as ProfileEl;
    el.descriptor = SAMPLE_DESCRIPTOR;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it('has ARIA role=region and aria-label including agent name', async () => {
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toContain('Test Support Agent');
  });

  it('renders header with name and avatar', async () => {
    await el.updateComplete;
    const name = el.shadowRoot!.querySelector('.profile-name');
    expect(name?.textContent?.trim()).toBe('Test Support Agent');
    const avatar = el.shadowRoot!.querySelector('agent-avatar');
    expect(avatar).toBeTruthy();
  });

  it('renders slot and provider badges', async () => {
    await el.updateComplete;
    const slotBadge = el.shadowRoot!.querySelector('.badge-slot');
    const providerBadge = el.shadowRoot!.querySelector('.badge-provider');
    expect(slotBadge?.textContent?.trim()).toBe('supporter');
    expect(providerBadge?.textContent?.trim()).toBe('anthropic');
  });

  it('renders capabilities cards', async () => {
    await el.updateComplete;
    const caps = el.shadowRoot!.querySelectorAll('.capability-card');
    expect(caps.length).toBe(3);
    expect(caps[0]?.textContent?.trim()).toBe('issue-resolution');
  });

  it('renders disposition radar SVG', async () => {
    await el.updateComplete;
    const svg = el.shadowRoot!.querySelector('.radar-chart svg');
    expect(svg).toBeTruthy();
    const polygon = svg!.querySelector('polygon.radar-shape');
    expect(polygon).toBeTruthy();
  });

  it('renders per-axis disposition rows', async () => {
    await el.updateComplete;
    const rows = el.shadowRoot!.querySelectorAll('.axis-row');
    expect(rows.length).toBe(5);
  });

  it('renders goals section', async () => {
    await el.updateComplete;
    const goals = el.shadowRoot!.querySelectorAll('.goal-item');
    expect(goals.length).toBe(2);
  });

  it('renders constraints section', async () => {
    await el.updateComplete;
    const constraints = el.shadowRoot!.querySelectorAll('.constraint-item');
    expect(constraints.length).toBe(2);
  });

  it('renders briefing text', async () => {
    await el.updateComplete;
    const briefing = el.shadowRoot!.querySelector('.briefing-text');
    expect(briefing?.textContent).toContain('customer support specialist');
  });

  it('renders memory seed placeholder', async () => {
    await el.updateComplete;
    const placeholder = el.shadowRoot!.querySelector('.memory-placeholder');
    expect(placeholder).toBeTruthy();
  });

  it('edit button toggles inline edit mode', async () => {
    await el.updateComplete;
    const editBtn = el.shadowRoot!.querySelector('.edit-toggle') as HTMLElement;
    expect(editBtn).toBeTruthy();
    editBtn.click();
    await el.updateComplete;
    const editForm = el.shadowRoot!.querySelector('.edit-mode');
    expect(editForm).toBeTruthy();
  });

  it('emits agent:updated on save in edit mode', async () => {
    const handler = vi.fn();
    el.addEventListener('pages-event', handler as EventListener);
    await el.updateComplete;

    const editBtn = el.shadowRoot!.querySelector('.edit-toggle') as HTMLElement;
    editBtn.click();
    await el.updateComplete;

    const saveBtn = el.shadowRoot!.querySelector('.btn-save') as HTMLElement;
    expect(saveBtn).toBeTruthy();
    saveBtn.click();

    expect(handler).toHaveBeenCalled();
    const detail = (handler.mock.calls[0]![0] as CustomEvent).detail;
    expect(detail.topic).toBe('agent:updated');
    expect(detail.payload.agentId).toBe('agent-test-01');
  });

  it('handles missing descriptor gracefully', async () => {
    const empty = document.createElement('agent-profile') as ProfileEl;
    document.body.appendChild(empty);
    await empty.updateComplete;
    const name = empty.shadowRoot!.querySelector('.profile-name');
    expect(name).toBeNull();
    empty.remove();
  });
});
