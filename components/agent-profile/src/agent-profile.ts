import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type {
  FullAgentDescriptor,
  DispositionAxis,
} from '@casehubio/blocks-ui-core';
import { AgentSetupEventTopics, DISPOSITION_AXES, primaryTerm } from '@casehubio/blocks-ui-core';
import '@casehubio/agent-avatar-2d';

const AXIS_LABELS: Record<DispositionAxis, string> = {
  socialOrient: 'Social Orientation',
  ruleFollowing: 'Rule Following',
  riskAppetite: 'Risk Appetite',
  autonomy: 'Autonomy',
  conflictMode: 'Conflict Mode',
};

function radarPoint(cx: number, cy: number, r: number, index: number, total: number): [number, number] {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

@customElement('agent-profile')
export class AgentProfile extends LitElement {
  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, system-ui); }
    .profile-header {
      display: flex;
      align-items: center;
      gap: var(--pages-space-4, 1rem);
      margin-bottom: var(--pages-space-4, 1rem);
      padding-bottom: var(--pages-space-4, 1rem);
      border-bottom: 1px solid var(--pages-neutral-4, #e5e5e5);
    }
    .header-info { flex: 1; }
    .profile-name { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    .badge-row {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 6px;
    }
    .badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 10px;
      background: var(--pages-neutral-3, #f0f0f0);
      color: var(--pages-neutral-11, #262626);
      font-weight: 500;
    }
    .edit-toggle {
      background: none;
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      padding: 6px 12px;
      border-radius: var(--pages-radius-2, 4px);
      cursor: pointer;
      font-size: 13px;
      font-family: inherit;
    }
    .edit-toggle:hover { border-color: var(--pages-accent-7, #0066cc); }

    .section {
      margin-bottom: var(--pages-space-4, 1rem);
    }
    .section-title {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--pages-neutral-9, #737373);
      margin-bottom: var(--pages-space-2, 0.5rem);
    }

    .briefing-text {
      font-size: 14px;
      line-height: 1.5;
      color: var(--pages-neutral-11, #262626);
      padding: var(--pages-space-3, 0.75rem);
      background: var(--pages-neutral-2, #fafafa);
      border-radius: var(--pages-radius-2, 4px);
    }

    .capabilities-grid {
      display: flex;
      flex-wrap: wrap;
      gap: var(--pages-space-2, 0.5rem);
    }
    .capability-card {
      padding: 6px 12px;
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      border-radius: var(--pages-radius-2, 4px);
      font-size: 13px;
      background: var(--pages-neutral-1, #fff);
      color: var(--pages-neutral-12, #111);
    }

    .disposition-container {
      display: grid;
      grid-template-columns: 180px 1fr;
      gap: var(--pages-space-4, 1rem);
      align-items: start;
    }
    @media (max-width: 500px) {
      .disposition-container { grid-template-columns: 1fr; }
    }
    .radar-chart { text-align: center; }
    .radar-chart svg { width: 160px; height: 160px; }
    .axis-rows { display: flex; flex-direction: column; gap: 6px; }
    .axis-row {
      display: flex;
      align-items: center;
      gap: var(--pages-space-2, 0.5rem);
      font-size: 13px;
    }
    .axis-name {
      min-width: 120px;
      font-weight: 500;
      color: var(--pages-neutral-9, #737373);
    }
    .term-pill {
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      background: var(--pages-accent-3, #dbeafe);
      color: var(--pages-accent-11, #1e3a5f);
      font-weight: 500;
    }
    .term-weight {
      font-size: 11px;
      color: var(--pages-neutral-9, #737373);
    }

    .two-column {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--pages-space-4, 1rem);
    }
    @media (max-width: 500px) {
      .two-column { grid-template-columns: 1fr; }
    }
    .goal-item, .constraint-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      margin-bottom: 4px;
    }
    .priority-badge {
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 4px;
      font-weight: 600;
    }
    .priority-PRIMARY { background: var(--pages-accent-3, #dbeafe); color: var(--pages-accent-11, #1e3a5f); }
    .priority-SECONDARY { background: var(--pages-neutral-3, #f0f0f0); color: var(--pages-neutral-11, #262626); }
    .severity-HARD { background: var(--pages-danger-3, #fee2e2); color: var(--pages-danger-11, #7f1d1d); }
    .severity-SOFT { background: var(--pages-warning-3, #fef3c7); color: var(--pages-warning-11, #78350f); }

    .memory-placeholder {
      border: 2px dashed var(--pages-neutral-4, #e5e5e5);
      border-radius: var(--pages-radius-3, 8px);
      padding: var(--pages-space-4, 1rem);
      text-align: center;
      color: var(--pages-neutral-7, #a3a3a3);
      font-size: 13px;
    }

    .edit-mode textarea {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      border-radius: var(--pages-radius-2, 4px);
      font-size: 14px;
      font-family: inherit;
      box-sizing: border-box;
      resize: vertical;
      min-height: 80px;
      background: var(--pages-neutral-1, #fff);
      color: var(--pages-neutral-12, #111);
    }
    .edit-mode input[type="text"] {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      border-radius: var(--pages-radius-2, 4px);
      font-size: 14px;
      font-family: inherit;
      box-sizing: border-box;
      background: var(--pages-neutral-1, #fff);
      color: var(--pages-neutral-12, #111);
    }
    .edit-buttons {
      display: flex;
      justify-content: flex-end;
      gap: var(--pages-space-2, 0.5rem);
      margin-top: var(--pages-space-3, 0.75rem);
    }
    .btn-save {
      padding: 8px 16px;
      border: none;
      border-radius: var(--pages-radius-2, 4px);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      background: var(--pages-accent-9, #0066cc);
      color: var(--pages-accent-contrast, #fff);
    }
    .btn-cancel {
      padding: 8px 16px;
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      border-radius: var(--pages-radius-2, 4px);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      background: var(--pages-neutral-1, #fff);
    }
    .empty-state {
      padding: var(--pages-space-4, 1rem);
      text-align: center;
      color: var(--pages-neutral-9, #737373);
      font-size: 14px;
    }
  `;

  @property({ attribute: false }) descriptor?: FullAgentDescriptor;
  @state() private _editing = false;
  @state() private _editName = '';
  @state() private _editBriefing = '';

  override connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this._updateAriaLabel();
  }

  override updated() {
    this._updateAriaLabel();
  }

  private _updateAriaLabel() {
    const name = this.descriptor?.name;
    this.setAttribute('aria-label', name ? `Agent profile for ${name}` : 'Agent profile');
  }

  private _startEdit() {
    this._editing = true;
    this._editName = this.descriptor?.name ?? '';
    this._editBriefing = this.descriptor?.briefing ?? '';
  }

  private _cancelEdit() {
    this._editing = false;
  }

  private _save() {
    if (!this.descriptor) return;
    const updated: FullAgentDescriptor = {
      ...this.descriptor,
      name: this._editName,
    };
    if (this._editBriefing) {
      updated.briefing = this._editBriefing;
    }
    this.dispatchEvent(new CustomEvent('pages-event', {
      bubbles: true,
      composed: true,
      detail: {
        topic: AgentSetupEventTopics.AGENT_UPDATED,
        payload: updated,
      },
    }));
    this._editing = false;
  }

  private _renderRadar() {
    const d = this.descriptor?.disposition;
    if (!d) return nothing;

    const cx = 80, cy = 80, maxR = 65;
    const total = DISPOSITION_AXES.length;
    const gridLevels = [0.25, 0.5, 0.75, 1.0];

    const gridPolygons = gridLevels.map(level => {
      const points = DISPOSITION_AXES.map((_, i) => radarPoint(cx, cy, maxR * level, i, total));
      return points.map(p => `${p[0]},${p[1]}`).join(' ');
    });

    const axisLines = DISPOSITION_AXES.map((_, i) => {
      const [x, y] = radarPoint(cx, cy, maxR, i, total);
      return { x, y };
    });

    const shapePoints = DISPOSITION_AXES.map((axis, i) => {
      const term = primaryTerm(d, axis);
      const weight = term?.weight ?? 0;
      return radarPoint(cx, cy, maxR * weight, i, total);
    });
    const shapePath = shapePoints.map(p => `${p[0]},${p[1]}`).join(' ');

    return html`
      <div class="radar-chart">
        <svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
          ${gridPolygons.map(pts => html`
            <polygon points="${pts}" fill="none" stroke="var(--pages-neutral-4, #e5e5e5)" stroke-width="0.5" />
          `)}
          ${axisLines.map(p => html`
            <line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="var(--pages-neutral-4, #e5e5e5)" stroke-width="0.5" />
          `)}
          <polygon class="radar-shape" points="${shapePath}" fill="var(--pages-accent-5, #93c5fd)" fill-opacity="0.4" stroke="var(--pages-accent-9, #0066cc)" stroke-width="1.5" />
          ${shapePoints.map(p => html`
            <circle cx="${p[0]}" cy="${p[1]}" r="3" fill="var(--pages-accent-9, #0066cc)" />
          `)}
        </svg>
      </div>
    `;
  }

  private _renderAxisRows() {
    const d = this.descriptor?.disposition;
    if (!d) return nothing;

    return html`
      <div class="axis-rows">
        ${DISPOSITION_AXES.map(axis => {
          const values = d[axis];
          const primary = primaryTerm(d, axis);
          return html`
            <div class="axis-row">
              <span class="axis-name">${AXIS_LABELS[axis]}</span>
              ${values?.map(v => html`
                <span class="term-pill">${v.term}</span>
                ${values.length > 1 ? html`<span class="term-weight">${v.weight.toFixed(1)}</span>` : nothing}
              `) ?? html`<span class="term-weight">—</span>`}
            </div>
          `;
        })}
      </div>
    `;
  }

  override render() {
    const desc = this.descriptor;
    if (!desc) return html`<div class="empty-state">No agent descriptor provided.</div>`;

    if (this._editing) return this._renderEditMode(desc);

    return html`
      <div class="profile-header">
        <agent-avatar .disposition=${desc.disposition ?? {}} size="lg"></agent-avatar>
        <div class="header-info">
          <div class="profile-name">${desc.name}</div>
          <div class="badge-row">
            ${desc.slot ? html`<span class="badge badge-slot">${desc.slot}</span>` : nothing}
            ${desc.provider ? html`<span class="badge badge-provider">${desc.provider}</span>` : nothing}
            ${desc.modelVersion ? html`<span class="badge">${desc.modelVersion}</span>` : nothing}
            ${desc.version ? html`<span class="badge">v${desc.version}</span>` : nothing}
          </div>
        </div>
        <button class="edit-toggle" @click=${() => this._startEdit()}>Edit</button>
      </div>

      ${desc.briefing ? html`
        <div class="section">
          <div class="section-title">Briefing</div>
          <div class="briefing-text">${desc.briefing}</div>
        </div>
      ` : nothing}

      ${desc.capabilities?.length ? html`
        <div class="section">
          <div class="section-title">Capabilities</div>
          <div class="capabilities-grid">
            ${desc.capabilities.map(c => html`<div class="capability-card">${c.name}</div>`)}
          </div>
        </div>
      ` : nothing}

      ${desc.disposition ? html`
        <div class="section">
          <div class="section-title">Disposition</div>
          <div class="disposition-container">
            ${this._renderRadar()}
            ${this._renderAxisRows()}
          </div>
        </div>
      ` : nothing}

      <div class="two-column">
        ${desc.goals?.length ? html`
          <div class="section">
            <div class="section-title">Goals</div>
            ${desc.goals.map(g => html`
              <div class="goal-item">
                <span class="priority-badge priority-${g.priority ?? 'SECONDARY'}">${g.priority ?? 'SECONDARY'}</span>
                <span>${g.name}</span>
              </div>
            `)}
          </div>
        ` : nothing}
        ${desc.constraints?.length ? html`
          <div class="section">
            <div class="section-title">Constraints</div>
            ${desc.constraints.map(c => html`
              <div class="constraint-item">
                <span class="priority-badge severity-${c.severity ?? 'SOFT'}">${c.severity ?? 'SOFT'}</span>
                <span>${c.name}</span>
              </div>
            `)}
          </div>
        ` : nothing}
      </div>

      <div class="section">
        <div class="section-title">Memory Seed</div>
        <div class="memory-placeholder">Memory seed configuration coming soon</div>
      </div>
    `;
  }

  private _renderEditMode(desc: FullAgentDescriptor) {
    return html`
      <div class="edit-mode">
        <div class="section">
          <div class="section-title">Name</div>
          <input type="text" .value=${this._editName}
            @input=${(e: Event) => { this._editName = (e.target as HTMLInputElement).value; }}>
        </div>
        <div class="section">
          <div class="section-title">Briefing</div>
          <textarea .value=${this._editBriefing}
            @input=${(e: Event) => { this._editBriefing = (e.target as HTMLTextAreaElement).value; }}></textarea>
        </div>
        <div class="edit-buttons">
          <button class="btn-cancel" @click=${() => this._cancelEdit()}>Cancel</button>
          <button class="btn-save" @click=${() => this._save()}>Save</button>
        </div>
      </div>
    `;
  }
}
