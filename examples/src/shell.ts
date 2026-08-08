import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '@casehubio/pages-ui-tokens/dist/init.js';
import '@casehubio/pages-ui-tokens/dist/theme-picker.js';
import { applyTheme } from '@casehubio/blocks-ui-core';

interface NavItem {
  id: string;
  label: string;
  hash: string;
}

interface NavCategory {
  label: string;
  items: NavItem[];
}

const NAV: NavCategory[] = [
  {
    label: 'Components',
    items: [
      { id: 'row', label: 'Work Item Row', hash: '#components/row' },
      { id: 'inbox', label: 'Work Item Inbox', hash: '#components/inbox' },
      { id: 'detail', label: 'Work Item Detail', hash: '#components/detail' },
      { id: 'queue', label: 'Queue + Inbox', hash: '#components/queue' },
      { id: 'sla-indicator', label: 'SLA Indicator', hash: '#components/sla-indicator' },
      { id: 'kpi-metric-row', label: 'KPI Metric Row', hash: '#components/kpi-metric-row' },
      { id: 'approval-gate', label: 'Approval Gate', hash: '#components/approval-gate' },
      { id: 'confirm-dialog', label: 'Confirm Dialog', hash: '#components/confirm-dialog' },
      { id: 'data-table', label: 'Data Table', hash: '#components/data-table' },
      { id: 'notifications', label: 'Notifications', hash: '#components/notifications' },
      { id: 'audit-trail', label: 'Audit Trail Viewer', hash: '#components/audit-trail' },
      { id: 'timeline-events', label: 'Timeline (Events)', hash: '#components/timeline-events' },
      { id: 'timeline-commitment', label: 'Timeline (Commitment)', hash: '#components/timeline-commitment' },
      { id: 'timeline-custom', label: 'Timeline (Custom)', hash: '#components/timeline-custom' },
      { id: 'trust-score', label: 'Trust Score Panel', hash: '#components/trust-score' },
      { id: 'channel-activity', label: 'Channel Activity', hash: '#components/channel-activity' },
      { id: 'commitment-lifecycle', label: 'Commitment Lifecycle', hash: '#components/commitment-lifecycle' },
      { id: 'similarity-panel', label: 'Similarity Panel', hash: '#components/similarity-panel' },
      { id: 'trust-feedback', label: 'Trust Feedback', hash: '#components/trust-feedback' },
      { id: 'compliance-summary', label: 'Compliance Summary', hash: '#components/compliance-summary' },
      { id: 'gdpr-erasure', label: 'GDPR Erasure', hash: '#components/gdpr-erasure' },
      { id: 'sla-breach-policy', label: 'SLA Breach Policy', hash: '#components/sla-breach-policy' },
      { id: 'grouped-data-view', label: 'Grouped Data View', hash: '#components/grouped-data-view' },
      { id: 'case-explorer', label: 'Case Explorer', hash: '#components/case-explorer' },
      { id: 'preferences-editor', label: 'Preferences Editor', hash: '#components/preferences-editor' },
      { id: 'session-workbench', label: 'Session Workbench', hash: '#components/session-workbench' },
      { id: 'commitment-viz', label: 'Commitment Viz', hash: '#components/commitment-viz' },
    ],
  },
  {
    label: 'Composed',
    items: [
      { id: 'workbench', label: 'Full Workbench', hash: '#composed/workbench' },
      { id: 'trust-workbench', label: 'Trust Workbench', hash: '#composed/trust-workbench' },
      { id: 'conversation-viewer', label: 'Conversation Viewer', hash: '#composed/conversation-viewer' },
    ],
  },
  {
    label: 'Document Workbench',
    items: [
      { id: 'document-diff', label: 'Document Diff', hash: '#document-workbench/document-diff' },
      { id: 'debate-feed', label: 'Debate Feed', hash: '#document-workbench/debate-feed' },
      { id: 'review-tracker', label: 'Review Tracker', hash: '#document-workbench/review-tracker' },
      { id: 'document-timeline', label: 'Document Timeline', hash: '#document-workbench/document-timeline' },
      { id: 'context-gauge', label: 'Context Gauge', hash: '#document-workbench/context-gauge' },
      { id: 'doc-picker', label: 'Doc Picker', hash: '#document-workbench/doc-picker' },
      { id: 'brainstorm-options', label: 'Brainstorm Options', hash: '#document-workbench/brainstorm-options' },
      { id: 'brainstorm-picker', label: 'Brainstorm Picker', hash: '#document-workbench/brainstorm-picker' },
      { id: 'workspace-status', label: 'Workspace Status', hash: '#document-workbench/workspace-status' },
    ],
  },
];


@customElement('blocks-example-shell')
export class ExampleShell extends LitElement {
  @state() private currentPage = '';
  @state() private theme: 'light' | 'dark' = 'dark';
  @state() private density: 'comfortable' | 'compact' = 'comfortable';

  static override styles = css`
    :host { display: flex; height: 100vh; font-family: var(--pages-font-family, system-ui); }

    .sidebar {
      width: 240px;
      background: var(--pages-neutral-2, #f5f5f5);
      border-right: 1px solid var(--pages-neutral-5, #e0e0e0);
      overflow-y: auto;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
    }

    .sidebar-header {
      padding: 16px;
      font-size: 16px;
      font-weight: 600;
      color: var(--pages-neutral-12, #111);
      border-bottom: 1px solid var(--pages-neutral-5, #e0e0e0);
    }

    .category { padding: 12px 0 4px 16px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--pages-neutral-9, #888); }

    .nav-item {
      display: block;
      padding: 8px 16px 8px 24px;
      font-size: 14px;
      color: var(--pages-neutral-11, #555);
      text-decoration: none;
      cursor: pointer;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
    }
    .nav-item:hover { background: var(--pages-neutral-3, #eee); color: var(--pages-neutral-12, #111); }
    .nav-item.active { background: var(--pages-accent-3, #e0e7ff); color: var(--pages-accent-11, #1e40af); font-weight: 500; }

    .controls { margin-top: auto; padding: 12px 16px; border-top: 1px solid var(--pages-neutral-5, #e0e0e0); display: flex; gap: 8px; }
    .toggle { padding: 4px 10px; border-radius: 4px; border: 1px solid var(--pages-neutral-6, #ccc); background: var(--pages-neutral-1, #fff); cursor: pointer; font-size: 12px; color: var(--pages-neutral-11, #555); }
    .toggle.active { background: var(--pages-accent-9, #2563eb); color: white; border-color: var(--pages-accent-9, #2563eb); }

    .content { flex: 1; overflow: auto; background: var(--pages-neutral-1, #fafafa); }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.applyCurrentTheme();
    this.currentPage = location.hash || '#composed/workbench';
    window.addEventListener('hashchange', this.onHashChange);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('hashchange', this.onHashChange);
  }

  private onHashChange = (): void => {
    this.currentPage = location.hash;
  };

  private applyCurrentTheme(): void {
    const name = this.theme === 'dark' ? 'casehub-dark' : 'casehub-light';
    applyTheme(name);
    if (this.density === 'compact') {
      document.documentElement.classList.add('pages-density-compact');
    } else {
      document.documentElement.classList.remove('pages-density-compact');
    }
  }

  private toggleTheme(): void {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    this.applyCurrentTheme();
  }

  private toggleDensity(): void {
    this.density = this.density === 'comfortable' ? 'compact' : 'comfortable';
    this.applyCurrentTheme();
  }

  override render() {
    return html`
      <nav class="sidebar">
        <div class="sidebar-header">blocks-ui Examples</div>
        ${NAV.map(cat => html`
          <div class="category">${cat.label}</div>
          ${cat.items.map(item => html`
            <button class="nav-item ${this.currentPage === item.hash ? 'active' : ''}"
              @click=${() => { location.hash = item.hash; }}>
              ${item.label}
            </button>
          `)}
        `)}
        <div class="controls">
          <pages-theme-picker></pages-theme-picker>
          <button class="toggle ${this.density === 'compact' ? 'active' : ''}" @click=${() => this.toggleDensity()}>
            ${this.density === 'compact' ? 'Compact' : 'Comfortable'}
          </button>
        </div>
      </nav>
      <main class="content">
        <slot name="${this.currentPage}"></slot>
        ${this.renderPage()}
      </main>
    `;
  }

  private renderPage() {
    switch (this.currentPage) {
      case '#components/row': return html`<blocks-example-row></blocks-example-row>`;
      case '#components/inbox': return html`<blocks-example-inbox></blocks-example-inbox>`;
      case '#components/detail': return html`<blocks-example-detail></blocks-example-detail>`;
      case '#components/queue': return html`<blocks-example-queue-inbox></blocks-example-queue-inbox>`;
      case '#components/sla-indicator': return html`<blocks-example-sla-indicator></blocks-example-sla-indicator>`;
      case '#components/kpi-metric-row': return html`<blocks-example-kpi-metric-row></blocks-example-kpi-metric-row>`;
      case '#components/approval-gate': return html`<blocks-example-approval-gate></blocks-example-approval-gate>`;
      case '#components/confirm-dialog': return html`<blocks-example-confirm-dialog></blocks-example-confirm-dialog>`;
      case '#components/data-table': return html`<blocks-example-data-table></blocks-example-data-table>`;
      case '#components/notifications': return html`<blocks-example-notification></blocks-example-notification>`;
      case '#components/audit-trail': return html`<blocks-example-audit-trail></blocks-example-audit-trail>`;
      case '#components/timeline-events': return html`<blocks-example-timeline-events></blocks-example-timeline-events>`;
      case '#components/timeline-commitment': return html`<blocks-example-timeline-commitment></blocks-example-timeline-commitment>`;
      case '#components/timeline-custom': return html`<blocks-example-timeline-custom></blocks-example-timeline-custom>`;
      case '#components/trust-score': return html`<blocks-example-trust-score></blocks-example-trust-score>`;
      case '#components/channel-activity': return html`<blocks-example-channel-activity></blocks-example-channel-activity>`;
      case '#components/commitment-lifecycle': return html`<blocks-example-commitment-lifecycle></blocks-example-commitment-lifecycle>`;
      case '#components/similarity-panel': return html`<blocks-example-similarity-panel></blocks-example-similarity-panel>`;
      case '#components/trust-feedback': return html`<blocks-example-trust-feedback></blocks-example-trust-feedback>`;
      case '#components/compliance-summary': return html`<blocks-example-compliance-summary></blocks-example-compliance-summary>`;
      case '#components/gdpr-erasure': return html`<blocks-example-gdpr-erasure></blocks-example-gdpr-erasure>`;
      case '#components/sla-breach-policy': return html`<blocks-example-sla-breach-policy></blocks-example-sla-breach-policy>`;
      case '#components/grouped-data-view': return html`<blocks-example-grouped-data-view></blocks-example-grouped-data-view>`;
      case '#components/case-explorer': return html`<blocks-example-case-explorer></blocks-example-case-explorer>`;
      case '#components/preferences-editor': return html`<blocks-example-preferences-editor></blocks-example-preferences-editor>`;
      case '#components/session-workbench': return html`<blocks-example-session-workbench></blocks-example-session-workbench>`;
      case '#components/commitment-viz': return html`<blocks-example-commitment-viz></blocks-example-commitment-viz>`;
      case '#composed/workbench': return html`<blocks-example-workbench></blocks-example-workbench>`;
      case '#composed/trust-workbench': return html`<blocks-example-trust-workbench></blocks-example-trust-workbench>`;
      case '#composed/conversation-viewer': return html`<blocks-example-conversation-viewer></blocks-example-conversation-viewer>`;
      default: return html`<blocks-example-workbench></blocks-example-workbench>`;
    }
  }
}
