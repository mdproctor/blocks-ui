import { initMockState } from './mock/mock-state.js';

const PAGE_MODULES = [
  './pages/row-page.js',
  './pages/inbox-page.js',
  './pages/detail-page.js',
  './pages/queue-inbox-page.js',
  './pages/workbench-page.js',
  './pages/sla-indicator-page.js',
  './pages/kpi-metric-row-page.js',
  './pages/approval-gate-page.js',
  './pages/confirm-dialog-page.js',
  './pages/data-table-page.js',
  './pages/notification-page.js',
  './pages/audit-trail-page.js',
  './pages/timeline-events-page.js',
  './pages/timeline-commitment-page.js',
  './pages/timeline-custom-page.js',
  './pages/trust-score-page.js',
  './pages/channel-activity-page.js',
  './pages/commitment-lifecycle-page.js',
  './pages/similarity-panel-page.js',
  './pages/trust-feedback-page.js',
  './pages/compliance-summary-page.js',
  './pages/gdpr-erasure-page.js',
  './pages/sla-breach-policy-page.js',
  './pages/grouped-data-view-page.js',
  './pages/case-explorer-page.js',
  './pages/trust-workbench-page.js',
  './pages/preferences-editor-page.js',
  './pages/session-workbench-page.js',
  './pages/commitment-viz-page.js',
  './pages/case-dependency-graph-page.js',
  './pages/document-diff-page.js',
  './pages/debate-feed-page.js',
  './pages/review-tracker-page.js',
  './pages/document-timeline-page.js',
  './pages/context-gauge-page.js',
  './pages/doc-picker-page.js',
  './pages/brainstorm-options-page.js',
  './pages/brainstorm-picker-page.js',
  './pages/workspace-status-page.js',
  './pages/conversation-viewer-page.js',
  './pages/decomposition-tree-page.js',
  './pages/plan-item-tree-page.js',
  './pages/plan-model-dashboard-page.js',
  './pages/dag-viewer-page.js',
  './pages/execution-monitor-page.js',
  './pages/orchestration-workbench-page.js',
  './pages/contributor-workbench-page.js',
  './pages/swf-diagram-page.js',
  './pages/casehub-diagram-page.js',
  './pages/diagram-workbench-page.js',
  './pages/diagram-export-page.js',
  './pages/avatar-page.js',
  './pages/worker-task-pane-page.js',
  './pages/rendering-primitives-page.js',
  './pages/push-updates-page.js',
];

async function bootstrap() {
  const app = document.getElementById('app')!;
  app.textContent = 'Loading mock data...';

  await initMockState();

  await import('./shell.js');

  const results = await Promise.allSettled(PAGE_MODULES.map(m => import(m)));
  const failed = results
    .map((r, i) => r.status === 'rejected' ? PAGE_MODULES[i] : null)
    .filter(Boolean);
  if (failed.length) {
    console.warn(`Failed to load ${failed.length} example page(s):`, failed);
  }

  app.textContent = '';
  app.appendChild(document.createElement('blocks-example-shell'));
}

bootstrap().catch(err => {
  console.error('Failed to bootstrap examples:', err);
  document.getElementById('app')!.textContent = `Error: ${err.message}`;
});
