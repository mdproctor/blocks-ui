// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { BlocksEnvMapEditorElement } from './blocks-env-map-editor.js';
import { BlocksSequenceEditorElement } from './blocks-sequence-editor.js';
import { BlocksSwfLinkElement } from './blocks-swf-link.js';

describe('blocks-env-map-editor', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('blocks-env-map-editor')).toBe(BlocksEnvMapEditorElement);
  });

  it('has a value property defaulting to empty object', () => {
    const el = new BlocksEnvMapEditorElement();
    expect(el.value).toEqual({});
  });

  it('has aria-label on textarea', async () => {
    const el = new BlocksEnvMapEditorElement();
    document.body.appendChild(el);
    await el.updateComplete;
    const textarea = el.shadowRoot!.querySelector('textarea');
    expect(textarea?.getAttribute('aria-label')).toBe('Environment variables');
    el.remove();
  });
});

describe('blocks-sequence-editor', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('blocks-sequence-editor')).toBe(BlocksSequenceEditorElement);
  });

  it('renders worker names as list items', async () => {
    const el = new BlocksSequenceEditorElement();
    el.value = ['worker-a', 'worker-b'];
    document.body.appendChild(el);
    await el.updateComplete;
    const items = el.shadowRoot!.querySelectorAll('li');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toBe('worker-a');
    expect(el.shadowRoot!.querySelector('ol')?.getAttribute('aria-label')).toBe('Worker sequence');
    el.remove();
  });
});

describe('blocks-swf-link', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('blocks-swf-link')).toBe(BlocksSwfLinkElement);
  });

  it('renders drill-down text with aria-label', async () => {
    const el = new BlocksSwfLinkElement();
    document.body.appendChild(el);
    await el.updateComplete;
    const span = el.shadowRoot!.querySelector('span');
    expect(span?.textContent).toContain('SWF drill-down');
    expect(span?.getAttribute('aria-label')).toBe('Edit via SWF drill-down');
    el.remove();
  });
});
