import { html, type TemplateResult } from 'lit-html';
import type { StencilGrammar } from '@casehubio/graph-core';

export const subcaseGrammar: StencilGrammar = {
  type: 'subcase',
  connections: {
    inbound: { min: 0, max: Infinity, allowedFrom: ['binding'] },
    outbound: { min: 0, max: 0, allowedTo: [] },
  },
};

export function renderSubCase(data: Record<string, unknown>): TemplateResult {
  const ns = String(data['namespace'] ?? '');
  const name = String(data['name'] ?? '');
  const version = String(data['version'] ?? '');
  const groupId = data['groupId'] as string | undefined;
  const total = data['totalInGroup'] as number | undefined;
  const required = data['requiredCount'] as number | undefined;

  return html`
    <div style="padding: 8px 12px; border: 3px double var(--pages-border-strong, #888); background: var(--pages-surface-color, #fff); min-width: 180px; font-family: var(--pages-font-family, sans-serif); font-size: 13px;">
      <div style="font-weight: 600; color: var(--pages-text-color, #333);">${name}</div>
      <div style="color: var(--pages-text-secondary, #666); font-size: 11px;">${ns} v${version}</div>
      ${groupId ? html`<div style="font-size: 11px; color: var(--pages-accent-color, #1a73e8); margin-top: 2px;">${required ?? total}/${total} (${groupId})</div>` : ''}
    </div>
  `;
}
