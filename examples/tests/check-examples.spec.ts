import { test, expect } from '@playwright/test';

const ALL_PAGES = [
  { hash: '#components/row', label: 'Work Item Row', tag: 'blocks-example-row' },
  { hash: '#components/inbox', label: 'Work Item Inbox', tag: 'blocks-example-inbox' },
  { hash: '#components/detail', label: 'Work Item Detail', tag: 'blocks-example-detail' },
  { hash: '#components/queue', label: 'Queue + Inbox', tag: 'blocks-example-queue-inbox' },
  { hash: '#components/sla-indicator', label: 'SLA Indicator', tag: 'blocks-example-sla-indicator' },
  { hash: '#components/kpi-metric-row', label: 'KPI Metric Row', tag: 'blocks-example-kpi-metric-row' },
  { hash: '#components/approval-gate', label: 'Approval Gate', tag: 'blocks-example-approval-gate' },
  { hash: '#components/confirm-dialog', label: 'Confirm Dialog', tag: 'blocks-example-confirm-dialog' },
  { hash: '#components/data-table', label: 'Data Table', tag: 'blocks-example-data-table' },
  { hash: '#components/notifications', label: 'Notifications', tag: 'blocks-example-notification' },
  { hash: '#components/audit-trail', label: 'Audit Trail Viewer', tag: 'blocks-example-audit-trail' },
  { hash: '#components/timeline-events', label: 'Timeline (Events)', tag: 'blocks-example-timeline-events' },
  { hash: '#components/timeline-commitment', label: 'Timeline (Commitment)', tag: 'blocks-example-timeline-commitment' },
  { hash: '#components/timeline-custom', label: 'Timeline (Custom)', tag: 'blocks-example-timeline-custom' },
  { hash: '#components/trust-score', label: 'Trust Score Panel', tag: 'blocks-example-trust-score' },
  { hash: '#components/channel-activity', label: 'Channel Activity', tag: 'blocks-example-channel-activity' },
  { hash: '#components/commitment-lifecycle', label: 'Commitment Lifecycle', tag: 'blocks-example-commitment-lifecycle' },
  { hash: '#components/similarity-panel', label: 'Similarity Panel', tag: 'blocks-example-similarity-panel' },
  { hash: '#components/trust-feedback', label: 'Trust Feedback', tag: 'blocks-example-trust-feedback' },
  { hash: '#components/compliance-summary', label: 'Compliance Summary', tag: 'blocks-example-compliance-summary' },
  { hash: '#components/gdpr-erasure', label: 'GDPR Erasure', tag: 'blocks-example-gdpr-erasure' },
  { hash: '#components/sla-breach-policy', label: 'SLA Breach Policy', tag: 'blocks-example-sla-breach-policy' },
  { hash: '#components/grouped-data-view', label: 'Grouped Data View', tag: 'blocks-example-grouped-data-view' },
  { hash: '#components/case-explorer', label: 'Case Explorer', tag: 'blocks-example-case-explorer' },
  { hash: '#components/preferences-editor', label: 'Preferences Editor', tag: 'blocks-example-preferences-editor' },
  { hash: '#components/session-workbench', label: 'Session Workbench', tag: 'blocks-example-session-workbench' },
  { hash: '#components/commitment-viz', label: 'Commitment Viz', tag: 'blocks-example-commitment-viz' },
  { hash: '#components/case-dependency-graph', label: 'Case Dependency Graph', tag: 'blocks-example-case-dependency-graph' },
  { hash: '#components/contributor-workbench', label: 'Contributor Workbench', tag: 'blocks-example-contributor-workbench' },
  { hash: '#components/avatar', label: 'Avatar', tag: 'blocks-example-avatar' },
  { hash: '#orchestration/decomposition-tree', label: 'Decomposition Tree', tag: 'blocks-example-decomposition-tree' },
  { hash: '#orchestration/plan-item-tree', label: 'Plan Item Tree', tag: 'blocks-example-plan-item-tree' },
  { hash: '#orchestration/plan-model-dashboard', label: 'Plan Model Dashboard', tag: 'blocks-example-plan-model-dashboard' },
  { hash: '#orchestration/dag-viewer', label: 'DAG Viewer', tag: 'blocks-example-dag-viewer' },
  { hash: '#orchestration/execution-monitor', label: 'Execution Monitor', tag: 'blocks-example-execution-monitor' },
  { hash: '#orchestration/orchestration-workbench', label: 'Orchestration Workbench', tag: 'blocks-example-orchestration-workbench' },
  { hash: '#diagrams/casehub-diagram', label: 'CaseHub Diagram', tag: 'blocks-example-casehub-diagram' },
  { hash: '#diagrams/swf-diagram', label: 'SWF Diagram', tag: 'blocks-example-swf-diagram' },
  { hash: '#diagrams/diagram-workbench', label: 'Diagram Workbench', tag: 'blocks-example-diagram-workbench' },
  { hash: '#diagrams/diagram-export', label: 'Diagram Export', tag: 'blocks-example-diagram-export' },
  { hash: '#diagrams/org-diagram', label: 'Org Diagram', tag: 'blocks-example-org-diagram' },
  { hash: '#composed/workbench', label: 'Full Workbench', tag: 'blocks-example-workbench' },
  { hash: '#composed/trust-workbench', label: 'Trust Workbench', tag: 'blocks-example-trust-workbench' },
  { hash: '#composed/conversation-viewer', label: 'Conversation Viewer', tag: 'blocks-example-conversation-viewer' },
  { hash: '#composed/worker-task-pane', label: 'Worker Task Pane', tag: 'blocks-example-worker-task-pane' },
  { hash: '#composed/rendering-primitives', label: 'Rendering Primitives', tag: 'blocks-example-rendering-primitives' },
  { hash: '#composed/push-updates', label: 'Push Updates', tag: 'blocks-example-push-updates' },
  { hash: '#document-workbench/document-diff', label: 'Document Diff', tag: 'blocks-example-document-diff' },
  { hash: '#document-workbench/debate-feed', label: 'Debate Feed', tag: 'blocks-example-debate-feed' },
  { hash: '#document-workbench/review-tracker', label: 'Review Tracker', tag: 'blocks-example-review-tracker' },
  { hash: '#document-workbench/document-timeline', label: 'Document Timeline', tag: 'blocks-example-document-timeline' },
  { hash: '#document-workbench/context-gauge', label: 'Context Gauge', tag: 'blocks-example-context-gauge' },
  { hash: '#document-workbench/doc-picker', label: 'Doc Picker', tag: 'blocks-example-doc-picker' },
  { hash: '#document-workbench/brainstorm-options', label: 'Brainstorm Options', tag: 'blocks-example-brainstorm-options' },
  { hash: '#document-workbench/brainstorm-picker', label: 'Brainstorm Picker', tag: 'blocks-example-brainstorm-picker' },
  { hash: '#document-workbench/workspace-status', label: 'Workspace Status', tag: 'blocks-example-workspace-status' },
  { hash: '#agent-setup/agent-avatar', label: 'Agent Avatar 2D', tag: 'blocks-example-agent-avatar' },
  { hash: '#agent-setup/agent-manifest-editor', label: 'Manifest Editor', tag: 'blocks-example-agent-manifest-editor' },
  { hash: '#agent-setup/agent-catalog', label: 'Agent Catalog', tag: 'blocks-example-agent-catalog' },
  { hash: '#agent-setup/agent-profile', label: 'Agent Profile', tag: 'blocks-example-agent-profile' },
  { hash: '#agent-setup/agent-relationship-editor', label: 'Relationship Editor', tag: 'blocks-example-agent-relationship-editor' },
];

test('check all example pages for errors', async ({ page }) => {
  test.setTimeout(300000);
  const results: { label: string; hash: string; status: string; errors: string[]; hasContent: boolean }[] = [];

  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(2000);

  for (const p of ALL_PAGES) {
    const errors: string[] = [];

    const errorHandler = (msg: any) => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        errors.push(msg.text());
      }
    };
    page.on('console', errorHandler);

    const pageErrors: string[] = [];
    const pageErrorHandler = (err: any) => {
      pageErrors.push(err.message || String(err));
    };
    page.on('pageerror', pageErrorHandler);

    await page.evaluate((hash) => { location.hash = hash; }, p.hash);
    await page.waitForTimeout(500);

    const hasContent = await page.evaluate((tag) => {
      const shell = document.querySelector('blocks-example-shell');
      if (!shell || !shell.shadowRoot) return false;
      const el = shell.shadowRoot.querySelector(tag);
      if (!el) return false;
      const shadow = el.shadowRoot;
      if (!shadow) return false;
      const children = shadow.children;
      let hasReal = false;
      for (let i = 0; i < children.length; i++) {
        if (children[i].tagName !== 'STYLE') {
          hasReal = true;
          break;
        }
      }
      return hasReal;
    }, p.tag);

    const allErrors = [...errors, ...pageErrors.map(e => `[PAGE ERROR] ${e}`)];

    let status = 'OK';
    if (allErrors.length > 0 && !hasContent) status = 'BROKEN';
    else if (allErrors.length > 0) status = 'ERRORS';
    else if (!hasContent) status = 'EMPTY';

    results.push({ label: p.label, hash: p.hash, status, errors: allErrors, hasContent });

    page.removeListener('console', errorHandler);
    page.removeListener('pageerror', pageErrorHandler);
  }

  console.log('\n\n========== EXAMPLE PAGE RESULTS ==========\n');
  const broken = results.filter(r => r.status !== 'OK');
  const ok = results.filter(r => r.status === 'OK');

  console.log(`TOTAL: ${results.length} | OK: ${ok.length} | PROBLEMS: ${broken.length}\n`);

  if (broken.length > 0) {
    console.log('--- PROBLEMS ---');
    for (const r of broken) {
      console.log(`\n[${r.status}] ${r.label} (${r.hash})`);
      console.log(`  Has content: ${r.hasContent}`);
      for (const e of r.errors) {
        console.log(`  Error: ${e.substring(0, 200)}`);
      }
    }
  }

  console.log('\n--- OK ---');
  for (const r of ok) {
    console.log(`  ${r.label}`);
  }

  if (broken.length > 0) {
    const summary = broken.map(r => `${r.label}: ${r.status}`).join(', ');
    expect(broken.length, `Broken pages: ${summary}`).toBe(0);
  }
});
