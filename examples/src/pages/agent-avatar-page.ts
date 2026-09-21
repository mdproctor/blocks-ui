import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '../../../packages/agent-avatar-2d/src/agent-avatar.js';
import { generateCandidates } from '../../../packages/agent-avatar-2d/src/generator.js';
import type { AgentDisposition } from '@casehubio/blocks-ui-core';

const PRESETS: { label: string; disposition: AgentDisposition }[] = [
  {
    label: 'Collaborative Support',
    disposition: {
      socialOrient: [{ term: 'collaborative', weight: 1.0 }],
      ruleFollowing: [{ term: 'adaptive', weight: 1.0 }],
      riskAppetite: [{ term: 'cautious', weight: 1.0 }],
      autonomy: [{ term: 'semi-autonomous', weight: 1.0 }],
      conflictMode: [{ term: 'diplomatic', weight: 1.0 }],
    },
  },
  {
    label: 'Autonomous Developer',
    disposition: {
      socialOrient: [{ term: 'independent', weight: 0.7 }, { term: 'collaborative', weight: 0.3 }],
      ruleFollowing: [{ term: 'adaptive', weight: 1.0 }],
      riskAppetite: [{ term: 'moderate', weight: 1.0 }],
      autonomy: [{ term: 'fully-autonomous', weight: 1.0 }],
      conflictMode: [{ term: 'assertive', weight: 1.0 }],
    },
  },
  {
    label: 'Cautious Analyst',
    disposition: {
      socialOrient: [{ term: 'collaborative', weight: 1.0 }],
      ruleFollowing: [{ term: 'strict', weight: 1.0 }],
      riskAppetite: [{ term: 'cautious', weight: 1.0 }],
      autonomy: [{ term: 'directed', weight: 1.0 }],
      conflictMode: [{ term: 'diplomatic', weight: 1.0 }],
    },
  },
  {
    label: 'Creative Writer',
    disposition: {
      socialOrient: [{ term: 'collaborative', weight: 1.0 }],
      ruleFollowing: [{ term: 'creative', weight: 1.0 }],
      riskAppetite: [{ term: 'adventurous', weight: 0.6 }, { term: 'moderate', weight: 0.4 }],
      autonomy: [{ term: 'semi-autonomous', weight: 1.0 }],
      conflictMode: [{ term: 'diplomatic', weight: 1.0 }],
    },
  },
];

@customElement('blocks-example-agent-avatar')
export class AgentAvatarPage extends LitElement {
  @state() private _selectedPreset = 0;
  @state() private _candidates: string[] = [];

  static override styles = css`
    :host { display: block; padding: 24px; }
    h2 { margin-bottom: 8px; font-size: 20px; font-weight: 600; color: var(--pages-neutral-12, #111); }
    p { margin-bottom: 24px; color: var(--pages-neutral-11, #555); font-size: 14px; }
    h3 { margin: 24px 0 12px; font-size: 16px; font-weight: 600; }
    .preset-bar {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 24px;
    }
    .preset-btn {
      padding: 6px 16px;
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      border-radius: 16px;
      background: var(--pages-neutral-1, #fff);
      color: var(--pages-neutral-12, #111);
      cursor: pointer;
      font-size: 13px;
      font-family: inherit;
    }
    .preset-btn.active {
      background: var(--pages-accent-3, #dbeafe);
      border-color: var(--pages-accent-7, #0066cc);
    }
    .size-row {
      display: flex;
      align-items: flex-end;
      gap: 24px;
      margin-bottom: 32px;
    }
    .size-label {
      font-size: 11px;
      text-align: center;
      margin-top: 6px;
      color: var(--pages-neutral-9, #737373);
    }
    .candidates-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      gap: 12px;
    }
    .demo-section {
      padding: 16px;
      border: 1px solid var(--pages-neutral-5, #e0e0e0);
      border-radius: 6px;
      background: var(--pages-neutral-1, #fff);
      margin-bottom: 24px;
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    this._generateCandidates();
  }

  private _generateCandidates() {
    const preset = PRESETS[this._selectedPreset]!;
    this._candidates = generateCandidates(preset.disposition);
  }

  private _selectPreset(index: number) {
    this._selectedPreset = index;
    this._generateCandidates();
  }

  override render() {
    const preset = PRESETS[this._selectedPreset]!;
    return html`
      <h2>Agent Avatar 2D</h2>
      <p>Disposition-driven DiceBear Avataaars generation. Pick a preset to see how disposition maps to visual features.</p>

      <div class="preset-bar">
        ${PRESETS.map((p, i) => html`
          <button class="preset-btn ${i === this._selectedPreset ? 'active' : ''}"
            @click=${() => this._selectPreset(i)}>${p.label}</button>
        `)}
      </div>

      <h3>Sizes</h3>
      <div class="demo-section">
        <div class="size-row">
          ${(['xs', 'sm', 'md', 'lg'] as const).map(size => html`
            <div>
              <agent-avatar .disposition=${preset.disposition} size=${size}></agent-avatar>
              <div class="size-label">${size}</div>
            </div>
          `)}
        </div>
      </div>

      <h3>Candidates (${this._candidates.length} variations)</h3>
      <div class="demo-section">
        <div class="candidates-grid">
          ${this._candidates.map(svg => html`
            <div .innerHTML=${svg}></div>
          `)}
        </div>
      </div>
    `;
  }
}
