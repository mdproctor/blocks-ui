import type { FullAgentDescriptor } from '@casehubio/blocks-ui-core';
import { primaryTerm, DISPOSITION_AXES } from '@casehubio/blocks-ui-core';
import type { CatalogFilter } from './types.js';

export function filterTemplates(
  templates: FullAgentDescriptor[],
  filter: CatalogFilter,
  search: string,
): FullAgentDescriptor[] {
  const q = search.toLowerCase().trim();

  return templates.filter(t => {
    if (q) {
      const nameMatch = t.name.toLowerCase().includes(q);
      const briefingMatch = t.briefing?.toLowerCase().includes(q) ?? false;
      const capMatch = t.capabilities?.some(c =>
        c.name.toLowerCase().includes(q) || (c.description?.toLowerCase().includes(q) ?? false)
      ) ?? false;
      const slotMatch = t.slot?.toLowerCase().includes(q) ?? false;
      if (!nameMatch && !briefingMatch && !capMatch && !slotMatch) return false;
    }

    if (filter.disposition) {
      const term = filter.disposition.toLowerCase();
      const hasMatch = DISPOSITION_AXES.some(axis => {
        const pt = primaryTerm(t.disposition, axis);
        return pt?.term.toLowerCase() === term;
      });
      if (!hasMatch) return false;
    }

    return true;
  });
}
