import { html, type TemplateResult } from 'lit-html';
import type { StencilGrammar } from '@casehubio/graph-core';

export const bindingGrammar: StencilGrammar = {
  type: 'binding',
  connections: {
    inbound: { min: 0, max: Infinity, allowedFrom: ['worker', 'milestone'] },
    outbound: { min: 0, max: 1, allowedTo: ['worker', 'subcase', 'external'] },
  },
};

function triggerLabel(on: Record<string, unknown> | undefined): string {
  if (!on) return '?';
  if (on['contextChange']) return 'ctx';
  if (on['cloudEvent']) return 'event';
  if (on['schedule']) return 'sched';
  if (on['scopeActivated']) return 'scope';
  return '?';
}

function targetLabel(data: Record<string, unknown>): string {
  if (data['capability']) return String(data['capability']);
  if (data['subCase']) return 'subcase';
  if (data['humanTask']) return 'task';
  return '?';
}

export function renderBinding(data: Record<string, unknown>): TemplateResult {
  const name = String(data['name'] ?? '');
  const trigger = triggerLabel(data['on'] as Record<string, unknown> | undefined);
  const target = targetLabel(data);
  const when = data['when'] ? String(data['when']).slice(0, 40) : '';

  return html`
    <div style="padding: 8px 12px; border-radius: 8px; border: 2px solid var(--pages-border-color, #ccc); background: var(--pages-surface-color, #fff); min-width: 180px; font-family: var(--pages-font-family, sans-serif); font-size: 13px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <span style="font-weight: 600; color: var(--pages-text-color, #333);">${name}</span>
        <span style="background: var(--pages-accent-subtle, #e8f0fe); color: var(--pages-accent-color, #1a73e8); padding: 1px 6px; border-radius: 4px; font-size: 11px;">${trigger}</span>
      </div>
      <div style="color: var(--pages-text-secondary, #666); font-size: 12px;">→ ${target}</div>
      ${when ? html`<div style="color: var(--pages-text-tertiary, #999); font-size: 11px; margin-top: 2px; font-style: italic;">${when}</div>` : ''}
    </div>
  `;
}
