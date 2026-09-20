import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Manifest, ProviderDeclaration, ModelDescriptor } from '@casehubio/blocks-ui-core';
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
    h4 { margin: var(--pages-space-3, 0.75rem) 0 var(--pages-space-2, 0.5rem); font-size: 14px; font-weight: 600; }
    .credential-type-selector {
      display: flex;
      gap: var(--pages-space-2, 0.5rem);
      margin: var(--pages-space-2, 0.5rem) 0;
    }
    .credential-type-selector label {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      cursor: pointer;
    }
    .credential-input {
      display: flex;
      gap: var(--pages-space-2, 0.5rem);
      margin-top: var(--pages-space-2, 0.5rem);
    }
    .credential-input input {
      flex: 1;
      padding: 6px 10px;
      border: 1px solid var(--pages-neutral-5, #d4d4d4);
      border-radius: var(--pages-radius-2, 4px);
      font-size: 13px;
      font-family: inherit;
    }
    .tier-group { margin-top: var(--pages-space-2, 0.5rem); }
    .tier-group-header {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--pages-neutral-9, #737373);
      margin-bottom: 4px;
    }
    .model-checkbox {
      display: flex;
      align-items: center;
      gap: var(--pages-space-2, 0.5rem);
      padding: 4px 0;
      font-size: 13px;
    }
    .alias-editor { margin-top: var(--pages-space-3, 0.75rem); }
    .alias-row {
      display: flex;
      align-items: center;
      gap: var(--pages-space-2, 0.5rem);
      padding: 4px 0;
      font-size: 13px;
    }
    .alias-key { font-weight: 600; min-width: 120px; }
    .alias-value { color: var(--pages-neutral-9, #737373); }
    .button-row {
      display: flex;
      gap: var(--pages-space-2, 0.5rem);
      margin-top: var(--pages-space-4, 1rem);
    }
    button {
      padding: 6px 16px;
      border: 1px solid var(--pages-neutral-5, #d4d4d4);
      border-radius: var(--pages-radius-2, 4px);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      background: var(--pages-neutral-1, #fff);
    }
    .btn-test-connection { color: var(--pages-accent-9, #0066cc); }
    .btn-test-connection:hover { background: var(--pages-accent-2, #eff6ff); }
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

  private _groupModelsByTier(): Map<string, ModelDescriptor[]> {
    const m = this._selectedPreset?.manifest;
    if (!m?.models?.length) return new Map();
    const groups = new Map<string, ModelDescriptor[]>();
    for (const mod of m.models) {
      const tier = mod.tier ?? 'STANDARD';
      const arr = groups.get(tier) ?? [];
      arr.push(mod);
      groups.set(tier, arr);
    }
    return groups;
  }

  private _renderProviderExpanded() {
    if (!this._selectedPreset) return nothing;
    const m = this._selectedPreset.manifest;
    const tierGroups = this._groupModelsByTier();
    return html`
      <div class="provider-expanded">
        <h3>${this._selectedPreset.name}</h3>
        ${m.providers?.length ? html`
          <div class="provider-list">
            ${m.providers.map(p => html`
              <div class="provider-item">
                <span class="provider-vendor">${p.vendor}</span>
                ${p.host ? html` — <code>${p.host}</code>` : nothing}
              </div>
              <div class="credential-type-selector">
                <label><input type="radio" name="cred-${p.vendor}" value="env" checked> env</label>
                <label><input type="radio" name="cred-${p.vendor}" value="file"> file</label>
                <label><input type="radio" name="cred-${p.vendor}" value="ref"> ref</label>
              </div>
              <div class="credential-input">
                <input type="text" placeholder="${typeof p.credential === 'string' ? p.credential : 'credential'}" .value=${typeof p.credential === 'string' ? p.credential : ''}>
              </div>
            `)}
          </div>
        ` : nothing}
        ${tierGroups.size ? html`
          <h4>Models</h4>
          ${Array.from(tierGroups.entries()).map(([tier, models]) => html`
            <div class="tier-group">
              <div class="tier-group-header">${tier}</div>
              ${models.map(mod => html`
                <div class="model-checkbox">
                  <input type="checkbox" checked>
                  <span>${mod.displayName ?? mod.id}</span>
                  <span class="tier-badge tier-${mod.tier ?? 'STANDARD'}">${mod.tier ?? 'STANDARD'}</span>
                </div>
              `)}
            </div>
          `)}
        ` : nothing}
        ${m.aliases ? html`
          <div class="alias-editor">
            <h4>Aliases</h4>
            ${Object.entries(m.aliases).map(([key, alias]) => html`
              <div class="alias-row">
                <span class="alias-key">${key}</span>
                <span class="alias-value">${alias.tier ?? ''} ${alias.capabilities?.join(', ') ?? ''}</span>
              </div>
            `)}
          </div>
        ` : nothing}
        <div class="button-row">
          <button class="btn-test-connection">Test Connection</button>
        </div>
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
