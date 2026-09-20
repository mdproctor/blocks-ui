import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './agent-relationship-editor.js';
import type { AgentRelationship } from '@casehubio/graph-stencil-org';
import type { AgentRosterEntry } from './types.js';

const SAMPLE_RELATIONSHIPS: AgentRelationship[] = [
  { sourceAgentId: 'alice', targetAgentId: 'bob', kind: 'SUPERVISES', tenancyId: 't1' },
  { sourceAgentId: 'alice', targetAgentId: 'carol', kind: 'DELEGATES_TO', tenancyId: 't1' },
  { sourceAgentId: 'dave', targetAgentId: 'alice', kind: 'REPORTS_TO', tenancyId: 't1' },
];

const SAMPLE_ROSTER: AgentRosterEntry[] = [
  { agentId: 'alice', name: 'Alice' },
  { agentId: 'bob', name: 'Bob' },
  { agentId: 'carol', name: 'Carol' },
  { agentId: 'dave', name: 'Dave' },
  { agentId: 'eve', name: 'Eve' },
];

type EditorEl = HTMLElement & {
  agentId?: string;
  relationships?: AgentRelationship[];
  roster?: AgentRosterEntry[];
  updateComplete: Promise<boolean>;
};

describe('agent-relationship-editor', () => {
  let el: EditorEl;

  beforeEach(() => {
    el = document.createElement('agent-relationship-editor') as EditorEl;
    el.agentId = 'alice';
    el.relationships = SAMPLE_RELATIONSHIPS;
    el.roster = SAMPLE_ROSTER;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it('has ARIA role=region and aria-label including agentId', async () => {
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toContain('alice');
  });

  it('renders grouped sections by relationship kind', async () => {
    await el.updateComplete;
    const sections = el.shadowRoot!.querySelectorAll('.kind-section');
    expect(sections.length).toBeGreaterThanOrEqual(2);
  });

  it('renders relationship rows with direction arrows', async () => {
    await el.updateComplete;
    const rows = el.shadowRoot!.querySelectorAll('.relationship-row');
    expect(rows.length).toBe(3);
    const arrows = el.shadowRoot!.querySelectorAll('.direction-arrow');
    expect(arrows.length).toBe(3);
  });

  it('add button shows inline add form', async () => {
    await el.updateComplete;
    const addBtn = el.shadowRoot!.querySelector('.add-relationship') as HTMLElement;
    expect(addBtn).toBeTruthy();
    addBtn.click();
    await el.updateComplete;
    const addForm = el.shadowRoot!.querySelector('.add-form');
    expect(addForm).toBeTruthy();
  });

  it('add form has agent picker populated from roster', async () => {
    await el.updateComplete;
    const addBtn = el.shadowRoot!.querySelector('.add-relationship') as HTMLElement;
    addBtn.click();
    await el.updateComplete;
    const select = el.shadowRoot!.querySelector('.add-form select.agent-picker') as HTMLSelectElement;
    expect(select).toBeTruthy();
    const options = select.querySelectorAll('option');
    expect(options.length).toBeGreaterThanOrEqual(SAMPLE_ROSTER.length);
  });

  it('adding a relationship shows pending addition in green', async () => {
    await el.updateComplete;
    const addBtn = el.shadowRoot!.querySelector('.add-relationship') as HTMLElement;
    addBtn.click();
    await el.updateComplete;

    const agentPicker = el.shadowRoot!.querySelector('.add-form select.agent-picker') as HTMLSelectElement;
    agentPicker.value = 'eve';
    agentPicker.dispatchEvent(new Event('change'));

    const confirmAdd = el.shadowRoot!.querySelector('.add-form .btn-add-confirm') as HTMLElement;
    confirmAdd.click();
    await el.updateComplete;

    const pendingRows = el.shadowRoot!.querySelectorAll('.pending-addition');
    expect(pendingRows.length).toBe(1);
  });

  it('delete marks row as pending removal with strikethrough', async () => {
    await el.updateComplete;
    const deleteBtn = el.shadowRoot!.querySelector('.relationship-row .btn-delete') as HTMLElement;
    expect(deleteBtn).toBeTruthy();
    deleteBtn.click();
    await el.updateComplete;
    const pendingRows = el.shadowRoot!.querySelectorAll('.pending-removal');
    expect(pendingRows.length).toBe(1);
  });

  it('emits relationship:changed with changeset on confirm', async () => {
    const handler = vi.fn();
    el.addEventListener('pages-event', handler as EventListener);
    await el.updateComplete;

    const deleteBtn = el.shadowRoot!.querySelector('.relationship-row .btn-delete') as HTMLElement;
    deleteBtn.click();
    await el.updateComplete;

    const confirmBtn = el.shadowRoot!.querySelector('.btn-confirm') as HTMLElement;
    expect(confirmBtn).toBeTruthy();
    confirmBtn.click();

    expect(handler).toHaveBeenCalled();
    const detail = (handler.mock.calls[0]![0] as CustomEvent).detail;
    expect(detail.topic).toBe('relationship:changed');
    expect(detail.payload.removals).toHaveLength(1);
    expect(detail.payload.additions).toBeDefined();
  });

  it('handles empty relationships gracefully', async () => {
    const empty = document.createElement('agent-relationship-editor') as EditorEl;
    empty.agentId = 'alice';
    empty.relationships = [];
    empty.roster = SAMPLE_ROSTER;
    document.body.appendChild(empty);
    await empty.updateComplete;
    const emptyState = empty.shadowRoot!.querySelector('.empty-state');
    expect(emptyState).toBeTruthy();
    empty.remove();
  });
});
