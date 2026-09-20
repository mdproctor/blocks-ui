import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { AgentRelationship, RelationshipKind } from '@casehubio/graph-stencil-org';
import { AgentSetupEventTopics, lookupRelationshipType } from '@casehubio/blocks-ui-core';
import type { RelationshipChangeset, AgentRosterEntry } from './types.js';
import './arc-view.js';

type ViewTab = 'table' | 'arc';

const RELATIONSHIP_KINDS: RelationshipKind[] = [
  'SUPERVISES', 'DELEGATES_TO', 'ESCALATES_TO', 'REPORTS_TO', 'BACKS_UP', 'EXTENDED',
];

function kindToRegistryKey(kind: RelationshipKind): string {
  return kind.toLowerCase();
}

@customElement('agent-relationship-editor')
export class AgentRelationshipEditor extends LitElement {
  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, system-ui); }
    .kind-section {
      margin-bottom: var(--pages-space-4, 1rem);
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      border-radius: var(--pages-radius-3, 8px);
      overflow: hidden;
    }
    .kind-header {
      display: flex;
      align-items: center;
      gap: var(--pages-space-2, 0.5rem);
      padding: 8px 12px;
      background: var(--pages-neutral-2, #fafafa);
      font-size: 13px;
      font-weight: 600;
    }
    .kind-color {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    .relationship-row {
      display: flex;
      align-items: center;
      gap: var(--pages-space-2, 0.5rem);
      padding: 8px 12px;
      border-top: 1px solid var(--pages-neutral-3, #f0f0f0);
      font-size: 13px;
    }
    .relationship-row.pending-removal {
      background: var(--pages-danger-2, #fef2f2);
      text-decoration: line-through;
      opacity: 0.6;
    }
    .relationship-row.pending-addition {
      background: var(--pages-success-2, #f0fdf4);
    }
    .direction-arrow {
      font-size: 16px;
      color: var(--pages-neutral-9, #737373);
    }
    .agent-name {
      flex: 1;
      font-weight: 500;
    }
    .scope-badge {
      font-size: 11px;
      padding: 1px 6px;
      border-radius: 4px;
      background: var(--pages-neutral-3, #f0f0f0);
    }
    .btn-delete {
      background: none;
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      padding: 2px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      color: var(--pages-danger-9, #dc2626);
    }
    .btn-delete:hover { background: var(--pages-danger-2, #fef2f2); }

    .add-relationship {
      background: none;
      border: 1px dashed var(--pages-neutral-6, #a3a3a3);
      padding: 8px;
      border-radius: var(--pages-radius-2, 4px);
      cursor: pointer;
      font-size: 13px;
      color: var(--pages-neutral-9, #737373);
      width: 100%;
      text-align: center;
      margin-bottom: var(--pages-space-3, 0.75rem);
    }
    .add-relationship:hover {
      border-color: var(--pages-accent-7, #0066cc);
      color: var(--pages-accent-9, #0066cc);
    }

    .add-form {
      display: flex;
      gap: var(--pages-space-2, 0.5rem);
      align-items: center;
      padding: 8px 12px;
      background: var(--pages-success-2, #f0fdf4);
      border: 1px solid var(--pages-success-6, #16a34a);
      border-radius: var(--pages-radius-2, 4px);
      margin-bottom: var(--pages-space-3, 0.75rem);
      flex-wrap: wrap;
    }
    .add-form select {
      padding: 6px 8px;
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      border-radius: 4px;
      font-size: 13px;
      font-family: inherit;
    }
    .add-form input {
      padding: 6px 8px;
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      border-radius: 4px;
      font-size: 13px;
      font-family: inherit;
    }
    .btn-add-confirm {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      background: var(--pages-accent-9, #0066cc);
      color: #fff;
    }
    .btn-add-cancel {
      padding: 6px 12px;
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      border-radius: 4px;
      font-size: 13px;
      cursor: pointer;
      font-family: inherit;
      background: var(--pages-neutral-1, #fff);
    }

    .confirm-bar {
      display: flex;
      justify-content: flex-end;
      gap: var(--pages-space-2, 0.5rem);
      margin-top: var(--pages-space-3, 0.75rem);
    }
    .btn-confirm {
      padding: 8px 16px;
      border: none;
      border-radius: var(--pages-radius-2, 4px);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      background: var(--pages-accent-9, #0066cc);
      color: #fff;
    }
    .btn-reset {
      padding: 8px 16px;
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      border-radius: var(--pages-radius-2, 4px);
      font-size: 14px;
      cursor: pointer;
      font-family: inherit;
      background: var(--pages-neutral-1, #fff);
    }
    .empty-state {
      text-align: center;
      padding: var(--pages-space-4, 1rem);
      color: var(--pages-neutral-9, #737373);
      font-size: 14px;
    }
    .view-tabs {
      display: flex;
      gap: 2px;
      margin-bottom: var(--pages-space-3, 0.75rem);
    }
    .view-tab {
      padding: 6px 16px;
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      border-radius: 4px 4px 0 0;
      background: var(--pages-neutral-2, #fafafa);
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      font-family: inherit;
    }
    .view-tab.active {
      background: var(--pages-neutral-1, #fff);
      border-bottom-color: var(--pages-neutral-1, #fff);
      font-weight: 600;
    }
  `;

  @property({ type: String, attribute: 'agent-id' }) agentId = '';
  @property({ attribute: false }) relationships: AgentRelationship[] = [];
  @property({ attribute: false }) roster: AgentRosterEntry[] = [];

  @state() private _pendingAdditions: AgentRelationship[] = [];
  @state() private _pendingRemovals: Set<number> = new Set();
  @state() private _viewTab: ViewTab = 'table';
  @state() private _showAddForm = false;
  @state() private _addTargetId = '';
  @state() private _addKind: RelationshipKind = 'SUPERVISES';
  @state() private _addScope = '';

  override connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this._updateAriaLabel();
  }

  override updated() {
    this._updateAriaLabel();
  }

  private _updateAriaLabel() {
    this.setAttribute('aria-label', `Relationship editor for ${this.agentId || 'agent'}`);
  }

  private _groupByKind(): Map<RelationshipKind, { rel: AgentRelationship; index: number }[]> {
    const groups = new Map<RelationshipKind, { rel: AgentRelationship; index: number }[]>();
    const allRels = [...this.relationships, ...this._pendingAdditions];
    allRels.forEach((rel, index) => {
      const existing = groups.get(rel.kind) ?? [];
      existing.push({ rel, index });
      groups.set(rel.kind, existing);
    });
    return groups;
  }

  private _isOutgoing(rel: AgentRelationship): boolean {
    return rel.sourceAgentId === this.agentId;
  }

  private _getOtherAgent(rel: AgentRelationship): string {
    return this._isOutgoing(rel) ? rel.targetAgentId : rel.sourceAgentId;
  }

  private _getAgentName(agentId: string): string {
    const entry = this.roster.find(r => r.agentId === agentId);
    return entry?.name ?? agentId;
  }

  private _markForRemoval(index: number) {
    this._pendingRemovals = new Set([...this._pendingRemovals, index]);
  }

  private _addRelationship() {
    if (!this._addTargetId) return;
    const rel: AgentRelationship = {
      sourceAgentId: this.agentId,
      targetAgentId: this._addTargetId,
      kind: this._addKind,
      tenancyId: '',
    };
    if (this._addScope) {
      rel.scope = { domain: this._addScope };
    }
    this._pendingAdditions = [...this._pendingAdditions, rel];
    this._showAddForm = false;
    this._addTargetId = '';
    this._addScope = '';
  }

  private _confirm() {
    const removals = [...this._pendingRemovals].map(i => this.relationships[i]!);
    const changeset: RelationshipChangeset = {
      additions: [...this._pendingAdditions],
      removals,
    };
    this.dispatchEvent(new CustomEvent('pages-event', {
      bubbles: true,
      composed: true,
      detail: {
        topic: AgentSetupEventTopics.RELATIONSHIP_CHANGED,
        payload: changeset,
      },
    }));
    this._pendingAdditions = [];
    this._pendingRemovals = new Set();
  }

  private _reset() {
    this._pendingAdditions = [];
    this._pendingRemovals = new Set();
    this._showAddForm = false;
  }

  private _hasPendingChanges(): boolean {
    return this._pendingAdditions.length > 0 || this._pendingRemovals.size > 0;
  }

  private _isPendingAddition(index: number): boolean {
    return index >= this.relationships.length;
  }

  override render() {
    const groups = this._groupByKind();

    if (this.relationships.length === 0 && this._pendingAdditions.length === 0 && !this._showAddForm) {
      return html`
        <div class="empty-state">No relationships defined.</div>
        <button class="add-relationship" @click=${() => { this._showAddForm = true; }}>+ Add Relationship</button>
      `;
    }

    return html`
      <div class="view-tabs">
        <button class="view-tab ${this._viewTab === 'table' ? 'active' : ''}" @click=${() => { this._viewTab = 'table'; }}>Table</button>
        <button class="view-tab ${this._viewTab === 'arc' ? 'active' : ''}" @click=${() => { this._viewTab = 'arc'; }}>Arc</button>
      </div>

      ${this._viewTab === 'arc' ? html`
        <arc-view agent-id=${this.agentId} .relationships=${this.relationships} .roster=${this.roster}></arc-view>
      ` : html`
      <button class="add-relationship" @click=${() => { this._showAddForm = true; }}>+ Add Relationship</button>

      ${this._showAddForm ? this._renderAddForm() : nothing}

      ${[...groups.entries()].map(([kind, entries]) => {
        const regKey = kindToRegistryKey(kind);
        const desc = lookupRelationshipType(regKey);
        return html`
          <div class="kind-section">
            <div class="kind-header">
              <span class="kind-color" style="background: ${desc.color}"></span>
              <span>${desc.label ?? kind}</span>
            </div>
            ${entries.map(({ rel, index }) => {
              const isRemoval = this._pendingRemovals.has(index);
              const isAddition = this._isPendingAddition(index);
              const other = this._getOtherAgent(rel);
              const outgoing = this._isOutgoing(rel);
              return html`
                <div class="relationship-row ${isRemoval ? 'pending-removal' : ''} ${isAddition ? 'pending-addition' : ''}">
                  <span class="direction-arrow">${outgoing ? '→' : '←'}</span>
                  <span class="agent-name">${this._getAgentName(other)}</span>
                  ${rel.scope?.domain ? html`<span class="scope-badge">${rel.scope.domain}</span>` : nothing}
                  ${!isRemoval && !isAddition ? html`
                    <button class="btn-delete" @click=${() => this._markForRemoval(index)}>Remove</button>
                  ` : nothing}
                </div>
              `;
            })}
          </div>
        `;
      })}

      ${this._hasPendingChanges() ? html`
        <div class="confirm-bar">
          <button class="btn-reset" @click=${() => this._reset()}>Reset</button>
          <button class="btn-confirm" @click=${() => this._confirm()}>Confirm Changes</button>
        </div>
      ` : nothing}
      `}
    `;
  }

  private _renderAddForm() {
    return html`
      <div class="add-form">
        <select class="agent-picker" .value=${this._addTargetId}
          @change=${(e: Event) => { this._addTargetId = (e.target as HTMLSelectElement).value; }}>
          <option value="">Select agent...</option>
          ${this.roster.map(r => html`<option value=${r.agentId}>${r.name}</option>`)}
        </select>
        <select class="kind-picker" .value=${this._addKind}
          @change=${(e: Event) => { this._addKind = (e.target as HTMLSelectElement).value as RelationshipKind; }}>
          ${RELATIONSHIP_KINDS.map(k => {
            const desc = lookupRelationshipType(kindToRegistryKey(k));
            return html`<option value=${k}>${desc.label ?? k}</option>`;
          })}
        </select>
        <input type="text" placeholder="Scope (optional)" .value=${this._addScope}
          @input=${(e: Event) => { this._addScope = (e.target as HTMLInputElement).value; }}>
        <button class="btn-add-confirm" @click=${() => this._addRelationship()}>Add</button>
        <button class="btn-add-cancel" @click=${() => { this._showAddForm = false; }}>Cancel</button>
      </div>
    `;
  }
}
