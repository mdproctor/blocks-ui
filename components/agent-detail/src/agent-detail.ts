import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { PushMixin } from '@casehubio/pages-component';
import '@casehubio/pages-ui-components';
import { EvolutionApi, EvolutionEventTopics, emitEvolutionEvent } from '@casehubio/blocks-ui-evolution-config';
import type { MethodologyMetadata, MethodologyEvent } from '@casehubio/blocks-ui-evolution-config';
import type { TabDefinition } from '@casehubio/blocks-ui-detail-pane';
import '@casehubio/blocks-ui-detail-pane';
import '@casehubio/blocks-ui-session-detail';
import type { AgentDetailProps, AgentControlConfig, AgentImprovementView, AgentAction } from './types.js';
import { SAFE_ACTIONS } from './types.js';

@customElement('blocks-agent-detail')
export class AgentDetail extends PushMixin(LitElement) {
  @property({ type: String }) endpoint?: string;
  @property({ type: String }) caseId?: string;
  @property({ type: String }) tenancyId?: string;
  @property({ type: String, attribute: 'improvement-case-id' }) improvementCaseId?: string;
  @property({ type: String, attribute: 'session-id' }) sessionId?: string;
  @property({ type: Object, attribute: false }) controlConfig?: AgentControlConfig;
  @property({ type: Object, attribute: false }) data?: AgentImprovementView;
  @property({ type: Array, attribute: false }) events?: readonly MethodologyEvent[];
  @property({ type: String, attribute: 'push-url' }) override pushUrl = '';
  @property({ type: Array, attribute: false }) override pushTopics: string[] = [];

  @state() private _fetchedMetadata: MethodologyMetadata | null = null;
  @state() private _fetchedEvents: MethodologyEvent[] = [];
  @state() private _loading = false;
  @state() private _error: string | null = null;
  @state() private _showConfirmDialog = false;
  @state() private _pendingAction: AgentAction | null = null;
  @state() private _actionReason = '';

  private _api?: EvolutionApi;

  private get _methodology(): MethodologyMetadata | null {
    return this.data?.methodology ?? this._fetchedMetadata;
  }

  private get _improvementId(): string | null {
    return this.data?.stream.improvementCaseId ?? this.improvementCaseId ?? null;
  }

  private get _sessionId(): string | null {
    return this.data?.sessionId ?? this.sessionId ?? null;
  }

  private get _activeSkill(): string {
    return this._methodology?.activeSkill ?? 'Idle';
  }

  private get _currentArtifact(): string | null {
    return this._methodology?.currentArtifact ?? null;
  }

  private get _stage(): string {
    return this.data?.stream.currentStage ?? '';
  }

  private get _category(): string {
    return this.data?.stream.category ?? '';
  }

  private get _allowedActions(): readonly AgentAction[] {
    return this.controlConfig?.allowedActions ?? [...SAFE_ACTIONS];
  }

  configure(props: Partial<AgentDetailProps>): void {
    if (props.endpoint !== undefined) this.endpoint = props.endpoint;
    if (props.caseId !== undefined) this.caseId = props.caseId;
    if (props.tenancyId !== undefined) this.tenancyId = props.tenancyId;
    if (props.improvementCaseId !== undefined) this.improvementCaseId = props.improvementCaseId;
    if (props.sessionId !== undefined) this.sessionId = props.sessionId;
    if (props.controlConfig !== undefined) this.controlConfig = props.controlConfig;
    if (props.data !== undefined) this.data = props.data;
    if (props.events !== undefined) this.events = props.events;
    if (props.pushUrl !== undefined) this.pushUrl = props.pushUrl;
    if (props.pushTopics !== undefined) this.pushTopics = [...props.pushTopics];
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    if (this._improvementId) {
      this.setAttribute('aria-label', `Agent detail for improvement ${this._improvementId}`);
    }
    if (this.endpoint && !this._api) {
      this._api = new EvolutionApi(this.endpoint);
    }
    if (this._api && this.caseId && this.tenancyId && this._improvementId && !this.data) {
      this._fetchMethodology();
    }
  }

  override onPushEvent(event: unknown): void {
    const me = event as MethodologyEvent;
    if (me?.id && me?.type) {
      this._fetchedEvents = [...this._fetchedEvents, me];
      if (me.payload?.type === 'SKILL_STARTED' || me.payload?.type === 'SKILL_COMPLETED' || me.payload?.type === 'SKILL_FAILED') {
        this._fetchMethodology();
      }
    }
  }

  private async _fetchMethodology(): Promise<void> {
    if (!this._api || !this.caseId || !this.tenancyId || !this._improvementId) return;
    this._loading = true;
    this._error = null;
    try {
      this._fetchedMetadata = await this._api.getMethodologyMetadata(this.caseId, this.tenancyId, this._improvementId);
    } catch (e) {
      this._error = e instanceof Error ? e.message : 'Failed to load methodology';
    } finally {
      this._loading = false;
    }
  }

  private _tabs(): TabDefinition[] {
    return [
      { id: 'session', label: 'Session', tagName: 'div', order: 10,
        renderContent: () => this._renderSession() },
      { id: 'methodology', label: 'Methodology', tagName: 'div', order: 20,
        renderContent: () => this._renderMethodology() },
    ];
  }

  private _renderSession() {
    const sid = this._sessionId;
    if (!sid) return html`<div class="empty">No session linked.</div>`;
    if (!this.endpoint) return html`<div class="empty">Session <strong>${sid}</strong> — connect an endpoint to see terminal, git, and health.</div>`;
    return html`
      <blocks-session-detail
        composed
        .endpoint=${this.endpoint}
        .sessionId=${sid}
      ></blocks-session-detail>
    `;
  }

  private _renderMethodology() {
    const allEvents = this.events ?? this._fetchedEvents;
    if (allEvents.length === 0) return html`<div class="empty">No methodology events.</div>`;
    return html`<div class="methodology-list">${allEvents.map(e => html`
      <div class="methodology-event">
        <span class="event-time">${new Date(e.timestamp).toLocaleTimeString()}</span>
        <span class="event-badge event-badge--${this._eventBadgeClass(e)}">${this._eventLabel(e)}</span>
      </div>
    `)}</div>`;
  }

  private _eventLabel(e: MethodologyEvent): string {
    switch (e.payload.type) {
      case 'SKILL_STARTED': return `Started: ${e.payload.skillName}`;
      case 'SKILL_COMPLETED': return `Completed: ${e.payload.skillName}`;
      case 'SKILL_FAILED': return `Failed: ${e.payload.skillName}`;
      case 'ARTIFACT_CREATED': return `Created: ${e.payload.artifactType}`;
      case 'ARTIFACT_UPDATED': return `Updated: ${e.payload.artifactType}`;
      case 'FORAGE_CAPTURED': return `Captured: ${e.payload.title}`;
      case 'GARDEN_ENTRY_CREATED': return `Garden: ${e.payload.title}`;
      case 'TEST_PASSED': return `Tests: ${e.payload.testCount} passed`;
      case 'TEST_FAILED': return `Tests: ${e.payload.failedCount}/${e.payload.testCount} failed`;
      case 'COMMIT_CREATED': return `Commit: ${e.payload.ref.slice(0, 7)}`;
      case 'PR_SUBMITTED': return `PR: #${e.payload.ref}`;
    }
  }

  private _eventBadgeClass(e: MethodologyEvent): string {
    switch (e.payload.type) {
      case 'SKILL_STARTED': return 'active';
      case 'SKILL_COMPLETED': case 'ARTIFACT_CREATED': case 'ARTIFACT_UPDATED':
      case 'FORAGE_CAPTURED': case 'GARDEN_ENTRY_CREATED': case 'TEST_PASSED':
      case 'COMMIT_CREATED': case 'PR_SUBMITTED': return 'ok';
      case 'SKILL_FAILED': case 'TEST_FAILED': return 'danger';
    }
  }

  private _actionLabel(action: AgentAction): string {
    switch (action) {
      case 'PAUSE': return 'Pause';
      case 'RESUME': return 'Resume';
      case 'INTERVENE': return 'Intervene';
      case 'FORCE_TRANSITION': return 'Force transition';
      case 'REASSIGN': return 'Reassign';
      case 'TERMINATE': return 'Terminate';
    }
  }

  private _isDestructive(action: AgentAction): boolean {
    return action === 'FORCE_TRANSITION' || action === 'REASSIGN' || action === 'TERMINATE';
  }

  private async _handleAction(action: AgentAction): Promise<void> {
    if (this._isDestructive(action)) {
      this._pendingAction = action;
      this._actionReason = '';
      this._showConfirmDialog = true;
      return;
    }
    await this._executeAction(action);
  }

  private async _confirmAction(): Promise<void> {
    const action = this._pendingAction;
    if (!action) return;
    this._showConfirmDialog = false;
    this._pendingAction = null;
    await this._executeAction(action, this._actionReason || undefined);
  }

  private async _executeAction(action: AgentAction, reason?: string): Promise<void> {
    if (!this._api || !this.caseId || !this.tenancyId || !this._improvementId) return;
    try {
      switch (action) {
        case 'PAUSE': await this._api.pauseAgent(this.caseId, this.tenancyId, this._improvementId, reason); break;
        case 'RESUME': await this._api.resumeAgent(this.caseId, this.tenancyId, this._improvementId); break;
        case 'TERMINATE': await this._api.terminateAgent(this.caseId, this.tenancyId, this._improvementId, reason); break;
        case 'INTERVENE': await this._api.sendInstruction(this.caseId, this.tenancyId, this._improvementId, reason ?? ''); break;
        case 'FORCE_TRANSITION': await this._api.forceTransition(this.caseId, this.tenancyId, this._improvementId, reason ?? ''); break;
        case 'REASSIGN': await this._api.reassignAgent(this.caseId, this.tenancyId, this._improvementId, reason ?? ''); break;
      }
      emitEvolutionEvent(this, EvolutionEventTopics.STREAM_CHANGED, { action: action.toLowerCase(), improvementId: this._improvementId });
    } catch (e) {
      this._error = e instanceof Error ? e.message : `Failed to ${action.toLowerCase()} agent`;
    }
  }

  static override styles = css`
    :host { display: flex; flex-direction: column; height: 100%; font-family: var(--pages-font-family, system-ui); }
    .header { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--pages-neutral-4, #e0e0e0); flex-shrink: 0; }
    .improvement-id { font-weight: 600; font-size: 13px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 500; }
    .badge--stage { background: var(--pages-neutral-3, #e5e5e5); color: var(--pages-neutral-11, #333); }
    .badge--category { background: var(--pages-accent-3, #dbeafe); color: var(--pages-accent-11, #1e40af); }
    .indicator { padding: 4px 12px; font-size: 12px; color: var(--pages-neutral-9, #737373); border-bottom: 1px solid var(--pages-neutral-3, #f0f0f0); flex-shrink: 0; }
    .indicator-skill { font-weight: 600; color: var(--pages-accent-11, #1e40af); }
    .indicator-artifact { font-style: italic; margin-left: 8px; }
    .tabs { flex: 1; overflow: hidden; }
    .control-bar { display: flex; gap: 8px; padding: 8px 12px; border-top: 1px solid var(--pages-neutral-4, #e0e0e0); flex-shrink: 0; }
    .control-bar button { padding: 4px 12px; border: none; border-radius: 4px; font-size: 12px; font-weight: 500; cursor: pointer; }
    .control-bar button.safe { background: var(--pages-neutral-3, #e5e5e5); color: var(--pages-neutral-11, #333); }
    .control-bar button.destructive { background: var(--pages-danger-3, #fee); color: var(--pages-danger-11, #c00); }
    .empty { padding: 24px; text-align: center; color: var(--pages-neutral-9, #737373); }
    .error { padding: 8px 12px; background: var(--pages-danger-3, #fee); color: var(--pages-danger-11, #c00); border-radius: 4px; margin: 8px 12px; font-size: 12px; }
    .methodology-list { padding: 8px 12px; display: flex; flex-direction: column; gap: 4px; overflow: auto; }
    .methodology-event { display: flex; align-items: center; gap: 8px; font-size: 12px; }
    .event-time { color: var(--pages-neutral-9, #737373); font-family: var(--pages-font-mono, monospace); font-size: 11px; min-width: 70px; }
    .event-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 500; }
    .event-badge--ok { background: var(--pages-success-3, #dcfce7); color: var(--pages-success-11, #166534); }
    .event-badge--active { background: var(--pages-accent-3, #dbeafe); color: var(--pages-accent-11, #1e40af); }
    .event-badge--danger { background: var(--pages-danger-3, #fee); color: var(--pages-danger-11, #c00); }
    .confirm-reason label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 4px; }
    .confirm-reason input { width: 100%; padding: 8px; border: 1px solid var(--pages-neutral-6, #e0e0e0); border-radius: 4px; font-size: 13px; box-sizing: border-box; }
  `;

  override render() {
    this.setAttribute('aria-busy', String(this._loading));

    if (!this.data && !this._improvementId) {
      return html`<div class="empty">No agent selected.</div>`;
    }

    if (this._loading && !this._methodology) return html`<div class="empty">Loading agent detail...</div>`;

    return html`
      <div class="header">
        <span class="improvement-id">${this._improvementId}</span>
        ${this._category ? html`<span class="badge badge--category">${this._category}</span>` : nothing}
        ${this._stage ? html`<span class="badge badge--stage">${this._stage}</span>` : nothing}
      </div>
      <div class="indicator" role="status" aria-live="polite">
        <span class="indicator-skill">${this._activeSkill}</span>
        ${this._currentArtifact ? html`<span class="indicator-artifact">${this._currentArtifact}</span>` : nothing}
      </div>
      ${this._error ? html`<div class="error">${this._error}</div>` : nothing}
      <div class="tabs">
        <blocks-detail-pane
          ?standalone=${true}
          .tabs=${this._tabs()}
        ></blocks-detail-pane>
      </div>
      ${this._renderControlBar()}
      ${this._renderConfirmDialog()}
    `;
  }

  private _renderControlBar() {
    const actions = this._allowedActions;
    return html`
      <div class="control-bar">
        ${actions.map(action => html`
          <button
            class=${this._isDestructive(action) ? 'destructive' : 'safe'}
            aria-label=${this._actionLabel(action)}
            @click=${() => this._handleAction(action)}
          >${this._actionLabel(action)}</button>
        `)}
      </div>
    `;
  }

  private _renderConfirmDialog() {
    if (!this._showConfirmDialog) return nothing;
    return html`
      <pages-confirm-dialog
        .open=${this._showConfirmDialog}
        heading="${this._actionLabel(this._pendingAction!)} agent?"
        confirmLabel=${this._actionLabel(this._pendingAction!)}
        cancelLabel="Cancel"
        confirmVariant="danger"
        @confirm=${() => this._confirmAction()}
        @cancel=${() => { this._showConfirmDialog = false; this._pendingAction = null; }}
      >
        <div class="confirm-reason">
          <label>Reason</label>
          <input type="text" .value=${this._actionReason}
                 @input=${(e: Event) => { this._actionReason = (e.target as HTMLInputElement).value; }} />
        </div>
      </pages-confirm-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'blocks-agent-detail': AgentDetail;
  }
}
