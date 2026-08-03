import { html, type TemplateResult } from 'lit-html';
import type { StencilGrammar } from '@casehubio/graph-core';

export const milestoneGrammar: StencilGrammar = {
  type: 'milestone',
  connections: {
    inbound: { min: 0, max: Infinity, allowedFrom: ['binding', 'goal'] },
    outbound: { min: 0, max: Infinity, allowedTo: ['binding'] },
  },
};

export function renderMilestone(data: Record<string, unknown>): TemplateResult {
  const name = String(data['name'] ?? '');
  const sla = data['slaDuration'] ? String(data['slaDuration']) : '';

  return html`
    <div style="padding: 12px 20px; background: var(--pages-surface-color, #fff); border: 2px solid var(--pages-warning-color, #f9a825); min-width: 140px; font-family: var(--pages-font-family, sans-serif); font-size: 13px; transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
      <div style="transform: rotate(-45deg); text-align: center;">
        <div style="font-weight: 600; color: var(--pages-text-color, #333);">◆ ${name}</div>
        ${sla ? html`<div style="font-size: 11px; color: var(--pages-warning-color, #f9a825);">${sla}</div>` : ''}
      </div>
    </div>
  `;
}
