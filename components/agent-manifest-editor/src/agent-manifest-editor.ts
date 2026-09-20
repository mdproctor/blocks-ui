import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Manifest, ProviderDeclaration } from '@casehubio/blocks-ui-core';
import { AgentSetupEventTopics } from '@casehubio/blocks-ui-core';
import type { ManifestPreset, ProviderDetection } from './types.js';
import { BUILT_IN_PRESETS } from './presets.js';

@customElement('agent-manifest-editor')
export class AgentManifestEditor extends LitElement {
  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, system-ui); }
    .preset-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: var(--pages-space-3, 0.75rem);
    }
    .preset-card {
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      border-radius: var(--pages-radius-3, 8px);
      padding: var(--pages-space-4, 1rem);
      background: var(--pages-neutral-1, #fff);
      cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s;
      position: relative;
    }
    .preset-card:hover {
      border-color: var(--pages-accent-7, #0066cc);
      box-shadow: 0 0 0 1px var(--pages-accent-7, #0066cc);
    }
    .preset-card.selected {
      border-color: var(--pages-accent-9, #0066cc);
      box-shadow: 0 0 0 2px var(--pages-accent-9, #0066cc);
    }
    .card-name { font-weight: 600; margin-bottom: 4px; }
    .card-desc { font-size: 13px; color: var(--pages-neutral-9, #737373); }
    .detection-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 10px;
    }
    .detection-badge.detected {
      background: var(--pages-success-3, #dcfce7);
      color: var(--pages-success-11, #166534);
    }
    .detection-badge.partial {
      background: var(--pages-warning-3, #fef9c3);
      color: var(--pages-warning-11, #854d0e);
    }
    .provider-expanded {
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      border-radius: var(--pages-radius-3, 8px);
      padding: var(--pages-space-4, 1rem);
      margin-top: var(--pages-space-3, 0.75rem);
      background: var(--pages-neutral-2, #fafafa);
    }
    .provider-list { margin-top: var(--pages-space-3, 0.75rem); }
    .provider-item {
      padding: var(--pages-space-2, 0.5rem);
      border-bottom: 1px solid var(--pages-neutral-3, #f0f0f0);
      font-size: 14px;
    }
    .provider-vendor { font-weight: 600; }
    .model-list { margin-top: var(--pages-space-2, 0.5rem); }
    .model-item {
      display: flex;
      align-items: center;
      gap: var(--pages-space-2, 0.5rem);
      padding: 4px 0;
      font-size: 13px;
    }
    .tier-badge {
      font-size: 11px;
      padding: 1px 6px;
      border-radius: 4px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .tier-FLAGSHIP { background: #ede9fe; color: #5b21b6; }
    .tier-STANDARD { background: #dbeafe; color: #1e40af; }
    .tier-FAST { background: #dcfce7; color: #166534; }
    .tier-EMBEDDING { background: #f3f4f6; color: #374151; }
    h3 { margin: 0 0 var(--pages-space-3, 0.75rem); font-size: 16px; }
  `;

  @property({ type: Object }) data?: Manifest;
  @property({ type: String }) endpoint?: string;
  @property({ type: String, attribute: 'detection-endpoint' }) detectionEndpoint?: string;
  @property({ attribute: false }) presets?: ManifestPreset[];
  @property({ attribute: false }) detections?: ProviderDetection[];

  @state() private _selectedPreset: ManifestPreset | null = null;

  override connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'LLM manifest editor');
  }

  private _getPresets(): ManifestPreset[] {
    return this.presets ?? BUILT_IN_PRESETS;
  }

  private _getDetection(vendor: string): ProviderDetection | undefined {
    return this.detections?.find(d => d.vendor === vendor);
  }

  private _selectPreset(preset: ManifestPreset) {
    this._selectedPreset = preset;
    this.dispatchEvent(new CustomEvent('pages-event', {
      bubbles: true,
      composed: true,
      detail: {
        topic: AgentSetupEventTopics.MANIFEST_CONFIGURED,
        payload: preset.manifest,
      },
    }));
  }

  private _renderDetectionBadge(providers: ProviderDeclaration[] | undefined) {
    if (!this.detections?.length || !providers?.length) return nothing;
    for (const p of providers) {
      const det = this._getDetection(p.vendor);
      if (det?.detected) {
        return html`<span class="detection-badge detected">Detected</span>`;
      }
      if (det?.partial) {
        return html`<span class="detection-badge partial">Partial</span>`;
      }
    }
    return nothing;
  }

  private _renderProviderExpanded() {
    if (!this._selectedPreset) return nothing;
    const m = this._selectedPreset.manifest;
    return html`
      <div class="provider-expanded">
        <h3>${this._selectedPreset.name}</h3>
        ${m.providers?.length ? html`
          <div class="provider-list">
            ${m.providers.map(p => html`
              <div class="provider-item">
                <span class="provider-vendor">${p.vendor}</span>
                ${p.credential ? html` — <code>${typeof p.credential === 'string' ? p.credential : 'map credential'}</code>` : nothing}
                ${p.host ? html` — <code>${p.host}</code>` : nothing}
              </div>
            `)}
          </div>
        ` : nothing}
        ${m.models?.length ? html`
          <div class="model-list">
            ${m.models.map(mod => html`
              <div class="model-item">
                <span>${mod.displayName ?? mod.id}</span>
                ${mod.tier ? html`<span class="tier-badge tier-${mod.tier}">${mod.tier}</span>` : nothing}
              </div>
            `)}
          </div>
        ` : nothing}
      </div>
    `;
  }

  override render() {
    const presets = this._getPresets();
    return html`
      <div class="preset-grid">
        ${presets.map(preset => html`
          <div
            class="preset-card ${this._selectedPreset?.id === preset.id ? 'selected' : ''}"
            @click=${() => this._selectPreset(preset)}
          >
            ${this._renderDetectionBadge(preset.manifest.providers)}
            <div class="card-name">${preset.name}</div>
            <div class="card-desc">${preset.description}</div>
          </div>
        `)}
      </div>
      ${this._renderProviderExpanded()}
    `;
  }
}
