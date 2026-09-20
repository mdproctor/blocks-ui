import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './agent-catalog.js';
import { CATALOG_TEMPLATES, POPULAR_TEMPLATE_IDS } from './catalog-data.js';

type CatalogEl = HTMLElement & {
  templates?: typeof CATALOG_TEMPLATES;
  updateComplete: Promise<boolean>;
};

describe('agent-catalog', () => {
  let el: CatalogEl;

  beforeEach(() => {
    el = document.createElement('agent-catalog') as CatalogEl;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it('has ARIA role and label', async () => {
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('Agent template catalog');
  });

  it('renders popular section', async () => {
    await el.updateComplete;
    const popular = el.shadowRoot!.querySelector('.popular-section');
    expect(popular).toBeTruthy();
    const cards = popular!.querySelectorAll('.catalog-card');
    expect(cards.length).toBe(POPULAR_TEMPLATE_IDS.length);
  });

  it('renders all template cards', async () => {
    await el.updateComplete;
    const allCards = el.shadowRoot!.querySelectorAll('.catalog-card');
    expect(allCards.length).toBeGreaterThanOrEqual(CATALOG_TEMPLATES.length);
  });

  it('renders filter pills', async () => {
    await el.updateComplete;
    const pills = el.shadowRoot!.querySelectorAll('.filter-pill');
    expect(pills.length).toBeGreaterThan(0);
  });

  it('emits agent:selected on card click', async () => {
    const handler = vi.fn();
    el.addEventListener('pages-event', handler as EventListener);
    await el.updateComplete;
    const card = el.shadowRoot!.querySelector('.all-section .catalog-card') as HTMLElement;
    card?.click();
    expect(handler).toHaveBeenCalled();
    const detail = (handler.mock.calls[0]![0] as CustomEvent).detail;
    expect(detail.topic).toBe('agent:selected');
  });
});
