import { describe, it, expect, vi, afterEach } from 'vitest';
import type { EvolutionStateSnapshot, DenyPatternView, StageDescriptor, GatePolicy } from '@casehubio/blocks-ui-evolution-config';
import type { TabDefinition } from '@casehubio/blocks-ui-detail-pane';
import './evolution-workbench.js';
import { EvolutionWorkbench } from './evolution-workbench.js';

function createElement(): EvolutionWorkbench {
  const el = document.createElement('blocks-evolution-workbench') as EvolutionWorkbench;
  document.body.appendChild(el);
  return el;
}

const SAMPLE_STATE: EvolutionStateSnapshot = {
  caseId: '00000000-0000-0000-0000-000000000001',
  timestamp: '2026-09-26T10:00:00Z',
  healthScore: 0.82,
  componentScores: { 'test-coverage': 0.7, 'ci-stability': 0.9 },
  healthDelta: 0.03,
  healthWindowMinutes: 60,
  circuitBreakerState: 'CLOSED',
  categoryStates: {},
  projectComplianceLevel: 'BASIC',
  complianceEvaluatedAt: null,
  areaComplianceLevels: {},
  activeImprovementCount: 2,
  dailyImprovementCount: 5,
  evolutionEnabled: true,
  pendingInboxCount: 1,
};

const SAMPLE_DENY: DenyPatternView = {
  staticPatterns: ['EvolutionTicker'],
  dynamicPatterns: [{ pattern: 'AuthController', addedBy: 'admin', addedAt: '2026-09-25T12:00:00Z' }],
};

const SAMPLE_STAGES: StageDescriptor[] = [
  { id: 'pr-review', name: 'PR Review', ordinal: 8, gateCheckpoint: true, domainId: 'code-evolution' },
];

const SAMPLE_POLICY: GatePolicy = { modes: { 'pr-review': 'GATED' }, gateTimeoutMinutes: 720 };

describe('blocks-evolution-workbench', () => {
  afterEach(() => {
    document.body.querySelectorAll('blocks-evolution-workbench').forEach(el => el.remove());
  });

  it('has correct ARIA attributes', async () => {
    const el = createElement();
    el.state = SAMPLE_STATE;
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('Evolution workbench');
  });

  it('renders summary metrics from state snapshot', async () => {
    const el = createElement();
    el.state = SAMPLE_STATE;
    await el.updateComplete;
    const metrics = el.shadowRoot!.querySelectorAll('.metric-card');
    expect(metrics.length).toBe(5);
    expect(metrics[0]!.querySelector('.metric-value')!.textContent).toContain('82%');
    expect(metrics[1]!.querySelector('.metric-value')!.textContent).toContain('2');
    expect(metrics[2]!.querySelector('.metric-value')!.textContent).toContain('1');
  });

  it('renders circuit breaker with correct status class', async () => {
    const el = createElement();
    el.state = SAMPLE_STATE;
    await el.updateComplete;
    const badge = el.shadowRoot!.querySelector('.status-badge.status-badge--ok');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toContain('CLOSED');
  });

  it('renders tabs via detail-pane in standalone mode', async () => {
    const el = createElement();
    el.state = SAMPLE_STATE;
    await el.updateComplete;
    const detailPane = el.shadowRoot!.querySelector('blocks-detail-pane');
    expect(detailPane).not.toBeNull();
    expect((detailPane as any).standalone).toBe(true);
  });

  it('includes all five built-in tabs', async () => {
    const el = createElement();
    el.state = SAMPLE_STATE;
    await el.updateComplete;
    const detailPane = el.shadowRoot!.querySelector('blocks-detail-pane') as any;
    const tabIds = detailPane.tabs.map((t: TabDefinition) => t.id);
    expect(tabIds).toContain('streams');
    expect(tabIds).toContain('inbox');
    expect(tabIds).toContain('audit');
    expect(tabIds).toContain('config');
    expect(tabIds).toContain('health');
  });

  it('built-in tabs have renderContent callbacks', async () => {
    const el = createElement();
    el.state = SAMPLE_STATE;
    await el.updateComplete;
    const detailPane = el.shadowRoot!.querySelector('blocks-detail-pane') as any;
    const builtInTabs = detailPane.tabs.filter(
      (t: TabDefinition) => ['streams', 'inbox', 'audit', 'config', 'health'].includes(t.id)
    );
    for (const tab of builtInTabs) {
      expect(tab.renderContent).toBeDefined();
      expect(typeof tab.renderContent).toBe('function');
    }
  });

  it('custom tabs do not have renderContent', async () => {
    const el = createElement();
    el.state = SAMPLE_STATE;
    el.tabs = [{ id: 'trading-risk', label: 'Trading Risk', tagName: 'div', order: 30 }];
    await el.updateComplete;
    const detailPane = el.shadowRoot!.querySelector('blocks-detail-pane') as any;
    const customTab = detailPane.tabs.find((t: TabDefinition) => t.id === 'trading-risk');
    expect(customTab.renderContent).toBeUndefined();
  });

  it('merges domain-extensible tabs', async () => {
    const el = createElement();
    el.state = SAMPLE_STATE;
    el.tabs = [{ id: 'trading-risk', label: 'Trading Risk', tagName: 'div', order: 30 }];
    await el.updateComplete;
    const detailPane = el.shadowRoot!.querySelector('blocks-detail-pane') as any;
    const tabIds = detailPane.tabs.map((t: TabDefinition) => t.id);
    expect(tabIds).toContain('trading-risk');
    expect(tabIds.length).toBe(6); // 5 built-in + 1 custom
  });

  it('configure() updates properties', async () => {
    const el = createElement();
    el.configure({
      caseId: 'case-1',
      tenancyId: 'tenant-1',
      state: SAMPLE_STATE,
      denyPatterns: SAMPLE_DENY,
    });
    expect(el.caseId).toBe('case-1');
    expect(el.tenancyId).toBe('tenant-1');
    expect(el.state).toEqual(SAMPLE_STATE);
    expect(el.denyPatterns).toEqual(SAMPLE_DENY);
  });

  it('has container queries in static styles', () => {
    const cssText = (EvolutionWorkbench as any).styles.cssText ?? String((EvolutionWorkbench as any).styles);
    expect(cssText).toContain('container-type');
    expect(cssText).toContain('container-name');
    expect(cssText).toContain('@container');
  });

  it('shows loading state when no data', async () => {
    const el = createElement();
    (el as any)._loading = true;
    await el.updateComplete;
    const loading = el.shadowRoot!.querySelector('.loading');
    expect(loading).not.toBeNull();
  });

  it('shows error state', async () => {
    const el = createElement();
    (el as any)._error = 'Network error';
    await el.updateComplete;
    const error = el.shadowRoot!.querySelector('.error');
    expect(error).not.toBeNull();
    expect(error!.textContent).toContain('Network error');
  });

  describe('agent drill-down', () => {
    async function waitForRender(el: EvolutionWorkbench): Promise<void> {
      await el.updateComplete;
      const detailPane = el.shadowRoot!.querySelector('blocks-detail-pane') as any;
      if (detailPane) await detailPane.updateComplete;
    }

    it('stores selected agent on _selectedAgent state', async () => {
      const el = createElement();
      el.state = SAMPLE_STATE;
      await waitForRender(el);
      expect((el as any)._selectedAgent).toBeNull();
      (el as any)._selectedAgent = { improvementCaseId: 'imp-1' };
      expect((el as any)._selectedAgent).toEqual({ improvementCaseId: 'imp-1' });
    });

    it('clears selected agent', async () => {
      const el = createElement();
      el.state = SAMPLE_STATE;
      (el as any)._selectedAgent = { improvementCaseId: 'imp-1' };
      await waitForRender(el);
      (el as any)._selectedAgent = null;
      expect((el as any)._selectedAgent).toBeNull();
    });

    it('listens for evolution:agent-selected and agent-deselected events', async () => {
      const el = createElement();
      el.state = SAMPLE_STATE;
      await waitForRender(el);
      el.dispatchEvent(new CustomEvent('pages-event', {
        bubbles: true, composed: true,
        detail: { topic: 'evolution:agent-selected', payload: { improvementCaseId: 'imp-1' } },
      }));
      expect((el as any)._selectedAgent).toEqual({ improvementCaseId: 'imp-1' });
      el.dispatchEvent(new CustomEvent('pages-event', {
        bubbles: true, composed: true,
        detail: { topic: 'evolution:agent-deselected', payload: {} },
      }));
      expect((el as any)._selectedAgent).toBeNull();
    });
  });
});
