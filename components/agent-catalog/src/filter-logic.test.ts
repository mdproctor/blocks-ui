import { describe, it, expect } from 'vitest';
import { filterTemplates } from './filter-logic.js';
import { CATALOG_TEMPLATES } from './catalog-data.js';
import type { CatalogFilter } from './types.js';

describe('filterTemplates', () => {
  it('returns all templates when no filters applied', () => {
    const result = filterTemplates(CATALOG_TEMPLATES, {}, '');
    expect(result).toHaveLength(CATALOG_TEMPLATES.length);
  });

  it('filters by search text matching name', () => {
    const result = filterTemplates(CATALOG_TEMPLATES, {}, 'customer');
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(t => t.name.toLowerCase().includes('customer'))).toBe(true);
  });

  it('filters by search text matching capability', () => {
    const result = filterTemplates(CATALOG_TEMPLATES, {}, 'debugging');
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(t => t.capabilities?.some(c => c.name === 'debugging'))).toBe(true);
  });

  it('filters by disposition trait', () => {
    const filter: CatalogFilter = { disposition: 'cautious' };
    const result = filterTemplates(CATALOG_TEMPLATES, filter, '');
    expect(result.length).toBeGreaterThan(0);
  });

  it('combines search and filter', () => {
    const filter: CatalogFilter = { disposition: 'cautious' };
    const all = filterTemplates(CATALOG_TEMPLATES, filter, '');
    const withSearch = filterTemplates(CATALOG_TEMPLATES, filter, 'medical');
    expect(withSearch.length).toBeLessThanOrEqual(all.length);
    expect(withSearch.length).toBeGreaterThan(0);
  });

  it('returns empty array when nothing matches', () => {
    const result = filterTemplates(CATALOG_TEMPLATES, {}, 'zzz-nonexistent-zzz');
    expect(result).toHaveLength(0);
  });
});
