import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { FullAgentDescriptor } from '@casehubio/blocks-ui-core';
import { AgentSetupEventTopics, primaryTerm } from '@casehubio/blocks-ui-core';
import { CATALOG_TEMPLATES, POPULAR_TEMPLATE_IDS } from './catalog-data.js';
import { filterTemplates } from './filter-logic.js';
import type { CatalogFilter } from './types.js';

const DISPOSITION_PILLS = ['collaborative', 'cautious', 'strict', 'autonomous', 'creative', 'assertive'];

@customElement('agent-catalog')
export class AgentCatalog extends LitElement {
  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, system-ui); }
    .search-bar {
      margin-bottom: var(--pages-space-3, 0.75rem);
    }
    .search-bar input {
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
    .filter-bar {
      display: flex;
      flex-wrap: wrap;
      gap: var(--pages-space-2, 0.5rem);
      margin-bottom: var(--pages-space-4, 1rem);
    }
    .filter-pill {
      padding: 4px 12px;
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      background: var(--pages-neutral-1, #fff);
      color: var(--pages-neutral-12, #111);
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }
    .filter-pill:hover { border-color: var(--pages-accent-7, #0066cc); }
    .filter-pill.active {
      background: var(--pages-accent-3, #dbeafe);
      border-color: var(--pages-accent-7, #0066cc);
      color: var(--pages-accent-11, #1e3a5f);
    }
    .section-header {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: var(--pages-space-2, 0.5rem);
      color: var(--pages-neutral-11, #262626);
    }
    .catalog-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: var(--pages-space-3, 0.75rem);
      margin-bottom: var(--pages-space-4, 1rem);
    }
    .catalog-card {
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      border-radius: var(--pages-radius-3, 8px);
      padding: var(--pages-space-3, 0.75rem);
      background: var(--pages-neutral-1, #fff);
      cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .catalog-card:hover {
      border-color: var(--pages-accent-7, #0066cc);
      box-shadow: 0 0 0 1px var(--pages-accent-7, #0066cc);
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: var(--pages-space-2, 0.5rem);
      margin-bottom: 6px;
    }
    .card-name { font-weight: 600; font-size: 14px; }
    .card-slot { font-size: 12px; color: var(--pages-neutral-9, #737373); }
    .card-caps {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 6px;
    }
    .cap-pill {
      font-size: 11px;
      padding: 1px 6px;
      border-radius: 4px;
      background: var(--pages-neutral-3, #f0f0f0);
      color: var(--pages-neutral-11, #262626);
    }
    .empty-state {
      text-align: center;
      padding: var(--pages-space-4, 1rem);
      color: var(--pages-neutral-9, #737373);
      font-size: 14px;
    }
  `;

  @property({ attribute: false }) templates?: FullAgentDescriptor[];
  @property({ type: String }) endpoint?: string;

  @state() private _search = '';
  @state() private _filter: CatalogFilter = {};

  override connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Agent template catalog');
  }

  private _getTemplates(): FullAgentDescriptor[] {
    return this.templates ?? CATALOG_TEMPLATES;
  }

  private _getPopular(): FullAgentDescriptor[] {
    const all = this._getTemplates();
    return POPULAR_TEMPLATE_IDS
      .map(id => all.find(t => t.agentId === id))
      .filter((t): t is FullAgentDescriptor => t !== undefined);
  }

  private _getFiltered(): FullAgentDescriptor[] {
    return filterTemplates(this._getTemplates(), this._filter, this._search);
  }

  private _selectTemplate(template: FullAgentDescriptor) {
    this.dispatchEvent(new CustomEvent('pages-event', {
      bubbles: true,
      composed: true,
      detail: {
        topic: AgentSetupEventTopics.AGENT_SELECTED,
        payload: template,
      },
    }));
  }

  private _togglePill(term: string) {
    if (this._filter.disposition === term) {
      this._filter = {};
    } else {
      this._filter = { disposition: term };
    }
  }

  private _renderCard(template: FullAgentDescriptor) {
    return html`
      <div class="catalog-card" @click=${() => this._selectTemplate(template)}>
        <div class="card-header">
          <div class="card-name">${template.name}</div>
        </div>
        ${template.slot ? html`<div class="card-slot">${template.slot}</div>` : nothing}
        ${template.capabilities?.length ? html`
          <div class="card-caps">
            ${template.capabilities.slice(0, 3).map(c => html`<span class="cap-pill">${c.name}</span>`)}
          </div>
        ` : nothing}
      </div>
    `;
  }

  override render() {
    const popular = this._getPopular();
    const filtered = this._getFiltered();

    return html`
      <div class="search-bar">
        <input
          type="text"
          placeholder="Search agents..."
          .value=${this._search}
          @input=${(e: Event) => { this._search = (e.target as HTMLInputElement).value; }}
        >
      </div>
      <div class="filter-bar">
        ${DISPOSITION_PILLS.map(pill => html`
          <span
            class="filter-pill ${this._filter.disposition === pill ? 'active' : ''}"
            @click=${() => this._togglePill(pill)}
          >${pill}</span>
        `)}
      </div>
      <div class="popular-section">
        <div class="section-header">Popular</div>
        <div class="catalog-grid">
          ${popular.map(t => this._renderCard(t))}
        </div>
      </div>
      <div class="all-section">
        <div class="section-header">All Templates</div>
        ${filtered.length ? html`
          <div class="catalog-grid">
            ${filtered.map(t => this._renderCard(t))}
          </div>
        ` : html`<div class="empty-state">No templates match your search.</div>`}
      </div>
    `;
  }
}
