import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './agent-manifest-editor.js';
import { BUILT_IN_PRESETS } from './presets.js';
import type { Manifest } from '@casehubio/blocks-ui-core';

type ManifestEditorEl = HTMLElement & {
  data?: Manifest;
  presets?: typeof BUILT_IN_PRESETS;
  detections?: { vendor: string; detected: boolean; partial: boolean }[];
  updateComplete: Promise<boolean>;
};

describe('agent-manifest-editor', () => {
  let el: ManifestEditorEl;

  beforeEach(() => {
    el = document.createElement('agent-manifest-editor') as ManifestEditorEl;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it('has ARIA role and label', async () => {
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('LLM manifest editor');
  });

  it('renders built-in preset cards when no custom presets provided', async () => {
    await el.updateComplete;
    const cards = el.shadowRoot!.querySelectorAll('.preset-card');
    expect(cards.length).toBe(BUILT_IN_PRESETS.length);
  });

  it('renders custom presets when provided', async () => {
    el.presets = [BUILT_IN_PRESETS[0]!];
    await el.updateComplete;
    const cards = el.shadowRoot!.querySelectorAll('.preset-card');
    expect(cards.length).toBe(1);
  });

  it('shows detection badge when detection data provided', async () => {
    el.detections = [{ vendor: 'anthropic', detected: true, partial: false }];
    await el.updateComplete;
    const badges = el.shadowRoot!.querySelectorAll('.detection-badge');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('expands provider section on card click', async () => {
    await el.updateComplete;
    const card = el.shadowRoot!.querySelector('.preset-card') as HTMLElement;
    card?.click();
    await el.updateComplete;
    const expanded = el.shadowRoot!.querySelector('.provider-expanded');
    expect(expanded).toBeTruthy();
  });

  it('emits manifest:configured when preset selected', async () => {
    const handler = vi.fn();
    el.addEventListener('pages-event', handler as EventListener);
    await el.updateComplete;
    const card = el.shadowRoot!.querySelector('.preset-card') as HTMLElement;
    card?.click();
    await el.updateComplete;
    expect(handler).toHaveBeenCalled();
    const detail = (handler.mock.calls[0]![0] as CustomEvent).detail;
    expect(detail.topic).toBe('manifest:configured');
  });
});

describe('agent-manifest-editor expanded section', () => {
  let el: ManifestEditorEl;

  beforeEach(async () => {
    el = document.createElement('agent-manifest-editor') as ManifestEditorEl;
    document.body.appendChild(el);
    await el.updateComplete;
    const card = el.shadowRoot!.querySelector('.preset-card') as HTMLElement;
    card?.click();
    await el.updateComplete;
  });

  afterEach(() => {
    el.remove();
  });

  it('shows credential type selector in expanded view', async () => {
    const selector = el.shadowRoot!.querySelector('.credential-type-selector');
    expect(selector).toBeTruthy();
  });

  it('shows model list grouped by tier', async () => {
    const tiers = el.shadowRoot!.querySelectorAll('.tier-group');
    expect(tiers.length).toBeGreaterThan(0);
  });

  it('shows alias editor section', async () => {
    const aliasSection = el.shadowRoot!.querySelector('.alias-editor');
    expect(aliasSection).toBeTruthy();
  });

  it('has test connection button', async () => {
    const btn = el.shadowRoot!.querySelector('.btn-test-connection');
    expect(btn).toBeTruthy();
  });
});

