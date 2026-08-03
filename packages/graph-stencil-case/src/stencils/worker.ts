import { html, type TemplateResult } from 'lit-html';
import type { StencilGrammar } from '@casehubio/graph-core';

export const workerGrammar: StencilGrammar = {
  type: 'worker',
  connections: {
    inbound: { min: 0, max: Infinity, allowedFrom: ['binding'] },
    outbound: { min: 0, max: Infinity, allowedTo: ['binding'] },
  },
};

export function renderWorker(data: Record<string, unknown>): TemplateResult {
  const name = String(data['name'] ?? '');
  const caps = (data['capabilities'] as string[] | undefined) ?? [];
  const desc = data['description'] ? String(data['description']).slice(0, 60) : '';

  return html`
    <div style="padding: 10px 14px; border: 2px solid var(--pages-border-strong, #888); background: var(--pages-surface-raised, #f8f8f8); min-width: 200px; font-family: var(--pages-font-family, sans-serif); font-size: 13px;">
      <div style="font-weight: 700; color: var(--pages-text-color, #333); margin-bottom: 4px;">${name}</div>
      <div style="color: var(--pages-text-secondary, #666); font-size: 11px;">${caps.join(', ')}</div>
      ${desc ? html`<div style="color: var(--pages-text-tertiary, #999); font-size: 11px; margin-top: 2px;">${desc}</div>` : ''}
    </div>
  `;
}
