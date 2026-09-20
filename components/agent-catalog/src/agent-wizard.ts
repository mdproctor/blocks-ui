import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type {
  FullAgentDescriptor,
  AgentDisposition,
  AgentCapability,
  AgentGoal,
  AgentConstraint,
  DispositionAxis,
  DispositionValue,
} from '@casehubio/blocks-ui-core';
import { AgentSetupEventTopics, DISPOSITION_AXES } from '@casehubio/blocks-ui-core';
import '@casehubio/agent-avatar-2d';

const STEP_LABELS = ['Identity', 'Capabilities', 'Disposition', 'Goals', 'Briefing', 'Avatar'] as const;
type StepLabel = typeof STEP_LABELS[number];

interface AxisTermOption {
  term: string;
  label: string;
}

const AXIS_LABELS: Record<DispositionAxis, string> = {
  socialOrient: 'Social Orientation',
  ruleFollowing: 'Rule Following',
  riskAppetite: 'Risk Appetite',
  autonomy: 'Autonomy',
  conflictMode: 'Conflict Mode',
};

const AXIS_TERMS: Record<DispositionAxis, AxisTermOption[]> = {
  socialOrient: [
    { term: 'collaborative', label: 'Collaborative — works with others towards shared goals' },
    { term: 'competitive', label: 'Competitive — drives for best individual outcomes' },
    { term: 'independent', label: 'Independent — operates autonomously by default' },
  ],
  ruleFollowing: [
    { term: 'strict', label: 'Strict — follows rules precisely as written' },
    { term: 'adaptive', label: 'Adaptive — applies rules with contextual judgment' },
    { term: 'creative', label: 'Creative — treats rules as guidelines, innovates freely' },
  ],
  riskAppetite: [
    { term: 'cautious', label: 'Cautious — minimises risk, errs on the safe side' },
    { term: 'moderate', label: 'Moderate — balanced risk/reward assessment' },
    { term: 'adventurous', label: 'Adventurous — explores boldly, accepts higher risk' },
  ],
  autonomy: [
    { term: 'fully-autonomous', label: 'Fully Autonomous — acts independently' },
    { term: 'semi-autonomous', label: 'Semi-Autonomous — acts independently within bounds' },
    { term: 'directed', label: 'Directed — follows explicit instructions closely' },
  ],
  conflictMode: [
    { term: 'assertive', label: 'Assertive — states positions firmly' },
    { term: 'diplomatic', label: 'Diplomatic — seeks consensus and compromise' },
    { term: 'avoidant', label: 'Avoidant — defers to others, minimises friction' },
  ],
};

@customElement('agent-wizard')
export class AgentWizard extends LitElement {
  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, system-ui); }
    .wizard-container {
      display: grid;
      grid-template-columns: 1fr 280px;
      gap: var(--pages-space-4, 1rem);
    }
    @media (max-width: 700px) {
      .wizard-container { grid-template-columns: 1fr; }
    }
    .step-indicator {
      display: flex;
      gap: 2px;
      margin-bottom: var(--pages-space-4, 1rem);
    }
    .step {
      flex: 1;
      padding: 6px 8px;
      text-align: center;
      font-size: 12px;
      font-weight: 500;
      background: var(--pages-neutral-3, #f0f0f0);
      color: var(--pages-neutral-9, #737373);
      border-radius: 4px;
      transition: background 0.15s, color 0.15s;
    }
    .step.active {
      background: var(--pages-accent-9, #0066cc);
      color: #fff;
    }
    .step.completed {
      background: var(--pages-accent-3, #dbeafe);
      color: var(--pages-accent-11, #1e3a5f);
    }
    .step-content {
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      border-radius: var(--pages-radius-3, 8px);
      padding: var(--pages-space-4, 1rem);
      background: var(--pages-neutral-1, #fff);
      min-height: 200px;
    }
    .step-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: var(--pages-space-3, 0.75rem);
    }
    .form-field {
      margin-bottom: var(--pages-space-3, 0.75rem);
    }
    .form-field label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: var(--pages-neutral-9, #737373);
      margin-bottom: 4px;
    }
    .form-field input[type="text"],
    .form-field textarea {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      border-radius: var(--pages-radius-2, 4px);
      font-size: 14px;
      font-family: inherit;
      box-sizing: border-box;
    }
    .form-field textarea {
      resize: vertical;
      min-height: 100px;
    }
    .button-row {
      display: flex;
      justify-content: flex-end;
      gap: var(--pages-space-2, 0.5rem);
      margin-top: var(--pages-space-4, 1rem);
    }
    button {
      padding: 8px 16px;
      border: none;
      border-radius: var(--pages-radius-2, 4px);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }
    .btn-next, .btn-finish {
      background: var(--pages-accent-9, #0066cc);
      color: #fff;
    }
    .btn-next:hover, .btn-finish:hover {
      background: var(--pages-accent-10, #0052a3);
    }
    .btn-back {
      background: var(--pages-neutral-4, #e5e5e5);
      color: var(--pages-neutral-11, #555);
    }
    .btn-back:hover { background: var(--pages-neutral-5, #d4d4d4); }

    .capability-list {
      display: flex;
      flex-direction: column;
      gap: var(--pages-space-2, 0.5rem);
    }
    .capability-row {
      display: flex;
      align-items: center;
      gap: var(--pages-space-2, 0.5rem);
    }
    .capability-row input { flex: 1; }
    .remove-btn {
      background: none;
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    .add-capability {
      background: none;
      border: 1px dashed var(--pages-neutral-6, #a3a3a3);
      padding: 8px;
      border-radius: var(--pages-radius-2, 4px);
      cursor: pointer;
      font-size: 13px;
      color: var(--pages-neutral-9, #737373);
      width: 100%;
      text-align: center;
    }
    .add-capability:hover {
      border-color: var(--pages-accent-7, #0066cc);
      color: var(--pages-accent-9, #0066cc);
    }
    .delegation-toggle {
      display: flex;
      align-items: center;
      gap: var(--pages-space-2, 0.5rem);
      margin-top: var(--pages-space-3, 0.75rem);
      font-size: 13px;
    }
    .delegation-toggle label { margin-bottom: 0; }

    .axis-picker {
      margin-bottom: var(--pages-space-3, 0.75rem);
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      border-radius: var(--pages-radius-2, 4px);
      padding: var(--pages-space-3, 0.75rem);
    }
    .axis-label {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .term-options {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .term-option {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      font-size: 13px;
      cursor: pointer;
    }
    .term-option input[type="radio"] { margin-top: 2px; }

    .advanced-toggle {
      font-size: 12px;
      color: var(--pages-accent-9, #0066cc);
      cursor: pointer;
      margin-top: var(--pages-space-2, 0.5rem);
      display: inline-block;
    }
    .advanced-toggle:hover { text-decoration: underline; }

    .weight-row {
      display: flex;
      align-items: center;
      gap: var(--pages-space-2, 0.5rem);
      margin-top: 4px;
      font-size: 12px;
    }
    .weight-row input[type="range"] { flex: 1; }
    .weight-value { min-width: 32px; text-align: right; }

    .item-list { margin-top: var(--pages-space-2, 0.5rem); }
    .item-row {
      display: flex;
      gap: var(--pages-space-2, 0.5rem);
      align-items: center;
      margin-bottom: 6px;
    }
    .item-row input { flex: 1; }
    .item-row select {
      padding: 6px 8px;
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      border-radius: 4px;
      font-size: 13px;
      font-family: inherit;
    }
    .add-item {
      background: none;
      border: 1px dashed var(--pages-neutral-6, #a3a3a3);
      padding: 6px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      color: var(--pages-neutral-9, #737373);
      width: 100%;
      text-align: center;
    }

    .avatar-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      gap: var(--pages-space-2, 0.5rem);
      margin-top: var(--pages-space-3, 0.75rem);
    }
    .avatar-option {
      border: 2px solid transparent;
      border-radius: var(--pages-radius-2, 4px);
      padding: 4px;
      cursor: pointer;
      text-align: center;
    }
    .avatar-option.selected {
      border-color: var(--pages-accent-9, #0066cc);
    }

    .preview-panel {
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      border-radius: var(--pages-radius-3, 8px);
      padding: var(--pages-space-3, 0.75rem);
      background: var(--pages-neutral-2, #fafafa);
      font-size: 13px;
    }
    .preview-section {
      margin-bottom: var(--pages-space-3, 0.75rem);
    }
    .preview-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--pages-neutral-9, #737373);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .preview-value {
      font-size: 13px;
      color: var(--pages-neutral-11, #262626);
    }
    .preview-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .preview-pill {
      font-size: 11px;
      padding: 1px 6px;
      border-radius: 4px;
      background: var(--pages-neutral-3, #f0f0f0);
    }
    .char-count {
      font-size: 11px;
      color: var(--pages-neutral-9, #737373);
      text-align: right;
      margin-top: 4px;
    }
  `;

  @state() private _step = 0;
  @state() private _name = '';
  @state() private _domain = '';
  @state() private _slot = '';
  @state() private _capabilities: AgentCapability[] = [];
  @state() private _delegation = false;
  @state() private _disposition: AgentDisposition = {};
  @state() private _advancedDisposition = false;
  @state() private _goals: AgentGoal[] = [];
  @state() private _constraints: AgentConstraint[] = [];
  @state() private _briefing = '';

  override connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'form');
    this.setAttribute('aria-label', 'Create custom agent');
  }

  private _buildDescriptor(): FullAgentDescriptor {
    const id = `agent-${this._slot || this._name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    const desc: FullAgentDescriptor = {
      agentId: id,
      name: this._name,
      tenancyId: '',
      disposition: this._delegation
        ? { ...this._disposition, delegation: true }
        : { ...this._disposition },
    };
    if (this._slot) desc.slot = this._slot;
    if (this._domain) desc.domainVocabulary = this._domain;
    if (this._capabilities.length > 0) desc.capabilities = this._capabilities;
    if (this._goals.length > 0) desc.goals = this._goals;
    if (this._constraints.length > 0) desc.constraints = this._constraints;
    if (this._briefing) desc.briefing = this._briefing;
    return desc;
  }

  private _finish() {
    const descriptor = this._buildDescriptor();
    this.dispatchEvent(new CustomEvent('pages-event', {
      bubbles: true,
      composed: true,
      detail: {
        topic: AgentSetupEventTopics.AGENT_CREATED,
        payload: descriptor,
      },
    }));
  }

  private _setDispositionTerm(axis: DispositionAxis, term: string) {
    const current = this._disposition[axis];
    if (this._advancedDisposition && current?.length) {
      const existing = current.find(v => v.term === term);
      if (existing) {
        this._disposition = {
          ...this._disposition,
          [axis]: current.filter(v => v.term !== term),
        };
      } else {
        const totalWeight = current.reduce((s, v) => s + v.weight, 0);
        const newWeight = Math.max(0.1, 1.0 - totalWeight);
        this._disposition = {
          ...this._disposition,
          [axis]: [...current, { term, weight: newWeight }],
        };
      }
    } else {
      this._disposition = {
        ...this._disposition,
        [axis]: [{ term, weight: 1.0 }],
      };
    }
    this.requestUpdate();
  }

  private _getSelectedTerm(axis: DispositionAxis): string | undefined {
    const values = this._disposition[axis];
    if (!values?.length) return undefined;
    return values.reduce((best, v) => v.weight > best.weight ? v : best, values[0]!).term;
  }

  private _addCapability() {
    this._capabilities = [...this._capabilities, { name: '' }];
  }

  private _removeCapability(index: number) {
    this._capabilities = this._capabilities.filter((_, i) => i !== index);
  }

  private _updateCapability(index: number, name: string) {
    this._capabilities = this._capabilities.map((c, i) => i === index ? { ...c, name } : c);
  }

  private _addGoal() {
    this._goals = [...this._goals, { name: '', priority: 'SECONDARY' }];
  }

  private _removeGoal(index: number) {
    this._goals = this._goals.filter((_, i) => i !== index);
  }

  private _addConstraint() {
    this._constraints = [...this._constraints, { name: '', severity: 'SOFT' }];
  }

  private _removeConstraint(index: number) {
    this._constraints = this._constraints.filter((_, i) => i !== index);
  }

  private _renderStepContent() {
    switch (this._step) {
      case 0: return this._renderIdentity();
      case 1: return this._renderCapabilities();
      case 2: return this._renderDisposition();
      case 3: return this._renderGoals();
      case 4: return this._renderBriefing();
      case 5: return this._renderAvatar();
      default: return nothing;
    }
  }

  private _renderIdentity() {
    return html`
      <div class="step-title">Identity</div>
      <div class="form-field">
        <label>Agent Name</label>
        <input type="text" data-field="name" .value=${this._name}
          @input=${(e: Event) => { this._name = (e.target as HTMLInputElement).value; }}
          placeholder="e.g. Customer Support Agent">
      </div>
      <div class="form-field">
        <label>Domain</label>
        <input type="text" data-field="domain" .value=${this._domain}
          @input=${(e: Event) => { this._domain = (e.target as HTMLInputElement).value; }}
          placeholder="e.g. customer-support, finance, medical">
      </div>
      <div class="form-field">
        <label>Slot</label>
        <input type="text" data-field="slot" .value=${this._slot}
          @input=${(e: Event) => { this._slot = (e.target as HTMLInputElement).value; }}
          placeholder="e.g. supporter, analyst, coordinator">
      </div>
    `;
  }

  private _renderCapabilities() {
    return html`
      <div class="step-title">Capabilities</div>
      <div class="capability-list">
        ${this._capabilities.map((cap, i) => html`
          <div class="capability-row">
            <input type="text" .value=${cap.name}
              @input=${(e: Event) => this._updateCapability(i, (e.target as HTMLInputElement).value)}
              placeholder="Capability name">
            <button class="remove-btn" @click=${() => this._removeCapability(i)}>Remove</button>
          </div>
        `)}
        <button class="add-capability" @click=${() => this._addCapability()}>+ Add Capability</button>
      </div>
      <div class="delegation-toggle">
        <input type="checkbox" data-field="delegation" .checked=${this._delegation}
          @change=${(e: Event) => { this._delegation = (e.target as HTMLInputElement).checked; }}>
        <label>Can delegate to sub-agents</label>
      </div>
    `;
  }

  private _renderDisposition() {
    return html`
      <div class="step-title">Disposition</div>
      ${DISPOSITION_AXES.map(axis => html`
        <div class="axis-picker">
          <div class="axis-label">${AXIS_LABELS[axis]}</div>
          <div class="term-options">
            ${AXIS_TERMS[axis].map(opt => html`
              <label class="term-option">
                <input type="radio" name=${axis}
                  .checked=${this._getSelectedTerm(axis) === opt.term}
                  @change=${() => this._setDispositionTerm(axis, opt.term)}>
                <span>${opt.label}</span>
              </label>
            `)}
          </div>
          ${this._advancedDisposition && this._disposition[axis]?.length ? html`
            ${this._disposition[axis]!.map((v, i) => html`
              <div class="weight-row">
                <span>${v.term}</span>
                <input type="range" min="0" max="1" step="0.1" .value=${String(v.weight)}
                  @input=${(e: Event) => {
                    const weight = parseFloat((e.target as HTMLInputElement).value);
                    const values = [...this._disposition[axis]!];
                    values[i] = { ...values[i]!, weight };
                    this._disposition = { ...this._disposition, [axis]: values };
                  }}>
                <span class="weight-value">${v.weight.toFixed(1)}</span>
              </div>
            `)}
          ` : nothing}
        </div>
      `)}
      <span class="advanced-toggle" @click=${() => { this._advancedDisposition = !this._advancedDisposition; }}>
        ${this._advancedDisposition ? 'Hide advanced' : 'Advanced: multi-term weights'}
      </span>
    `;
  }

  private _renderGoals() {
    return html`
      <div class="step-title">Goals &amp; Constraints</div>
      <div class="form-field">
        <label>Goals</label>
        <div class="item-list">
          ${this._goals.map((goal, i) => html`
            <div class="item-row">
              <input type="text" .value=${goal.name}
                @input=${(e: Event) => {
                  this._goals = this._goals.map((g, j) =>
                    j === i ? { ...g, name: (e.target as HTMLInputElement).value } : g);
                }}
                placeholder="Goal name">
              <select .value=${goal.priority ?? 'SECONDARY'}
                @change=${(e: Event) => {
                  this._goals = this._goals.map((g, j) =>
                    j === i ? { ...g, priority: (e.target as HTMLSelectElement).value } : g);
                }}>
                <option value="PRIMARY">Primary</option>
                <option value="SECONDARY">Secondary</option>
              </select>
              <button class="remove-btn" @click=${() => this._removeGoal(i)}>Remove</button>
            </div>
          `)}
          <button class="add-item" @click=${() => this._addGoal()}>+ Add Goal</button>
        </div>
      </div>
      <div class="form-field">
        <label>Constraints</label>
        <div class="item-list">
          ${this._constraints.map((con, i) => html`
            <div class="item-row">
              <input type="text" .value=${con.name}
                @input=${(e: Event) => {
                  this._constraints = this._constraints.map((c, j) =>
                    j === i ? { ...c, name: (e.target as HTMLInputElement).value } : c);
                }}
                placeholder="Constraint name">
              <select .value=${con.severity ?? 'SOFT'}
                @change=${(e: Event) => {
                  this._constraints = this._constraints.map((c, j) =>
                    j === i ? { ...c, severity: (e.target as HTMLSelectElement).value } : c);
                }}>
                <option value="HARD">Hard</option>
                <option value="SOFT">Soft</option>
              </select>
              <button class="remove-btn" @click=${() => this._removeConstraint(i)}>Remove</button>
            </div>
          `)}
          <button class="add-item" @click=${() => this._addConstraint()}>+ Add Constraint</button>
        </div>
      </div>
    `;
  }

  private _renderBriefing() {
    return html`
      <div class="step-title">Briefing</div>
      <div class="form-field">
        <label>Agent briefing — voice, identity, mannerisms</label>
        <textarea data-field="briefing" .value=${this._briefing}
          @input=${(e: Event) => { this._briefing = (e.target as HTMLTextAreaElement).value; }}
          maxlength="2000"
          placeholder="Describe how this agent should behave, communicate, and approach its work..."></textarea>
        <div class="char-count">${this._briefing.length} / 2000</div>
      </div>
    `;
  }

  private _renderAvatar() {
    return html`
      <div class="step-title">Avatar</div>
      <div class="form-field">
        <label>Generated from disposition</label>
        <agent-avatar .disposition=${this._disposition} size="lg"></agent-avatar>
      </div>
    `;
  }

  private _renderPreview() {
    return html`
      <div class="preview-panel">
        <div class="preview-label">Preview</div>
        ${this._name ? html`
          <div class="preview-section">
            <div class="preview-label">Name</div>
            <div class="preview-value">${this._name}</div>
          </div>
        ` : nothing}
        ${this._domain ? html`
          <div class="preview-section">
            <div class="preview-label">Domain</div>
            <div class="preview-value">${this._domain}</div>
          </div>
        ` : nothing}
        ${this._slot ? html`
          <div class="preview-section">
            <div class="preview-label">Slot</div>
            <div class="preview-value">${this._slot}</div>
          </div>
        ` : nothing}
        ${this._capabilities.length > 0 ? html`
          <div class="preview-section">
            <div class="preview-label">Capabilities</div>
            <div class="preview-pills">
              ${this._capabilities.filter(c => c.name).map(c => html`<span class="preview-pill">${c.name}</span>`)}
            </div>
          </div>
        ` : nothing}
        ${Object.keys(this._disposition).some(k =>
          k !== 'delegation' && (this._disposition as Record<string, unknown>)[k]
        ) ? html`
          <div class="preview-section">
            <div class="preview-label">Disposition</div>
            <div class="preview-pills">
              ${DISPOSITION_AXES.filter(a => this._getSelectedTerm(a)).map(a => html`
                <span class="preview-pill">${this._getSelectedTerm(a)}</span>
              `)}
            </div>
          </div>
        ` : nothing}
        ${this._goals.length > 0 ? html`
          <div class="preview-section">
            <div class="preview-label">Goals</div>
            <div class="preview-pills">
              ${this._goals.filter(g => g.name).map(g => html`<span class="preview-pill">${g.name}</span>`)}
            </div>
          </div>
        ` : nothing}
        ${this._briefing ? html`
          <div class="preview-section">
            <div class="preview-label">Briefing</div>
            <div class="preview-value">${this._briefing.length > 80 ? this._briefing.slice(0, 80) + '...' : this._briefing}</div>
          </div>
        ` : nothing}
      </div>
    `;
  }

  override render() {
    const isLast = this._step === STEP_LABELS.length - 1;
    return html`
      <div class="step-indicator">
        ${STEP_LABELS.map((label, i) => html`
          <span class="step ${i === this._step ? 'active' : i < this._step ? 'completed' : ''}">${label}</span>
        `)}
      </div>
      <div class="wizard-container">
        <div class="main-area">
          <div class="step-content">
            ${this._renderStepContent()}
          </div>
          <div class="button-row">
            ${this._step > 0 ? html`
              <button class="btn-back" @click=${() => { this._step--; }}>Back</button>
            ` : nothing}
            ${isLast ? html`
              <button class="btn-finish" @click=${() => this._finish()}>Create Agent</button>
            ` : html`
              <button class="btn-next" @click=${() => { this._step++; }}>Next</button>
            `}
          </div>
        </div>
        ${this._renderPreview()}
      </div>
    `;
  }
}
