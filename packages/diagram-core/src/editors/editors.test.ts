import { describe, it, expect } from 'vitest';
import { BlocksPromptEditorElement } from './blocks-prompt-editor.js';
import { BlocksJsonEditorElement } from './blocks-json-editor.js';

describe('blocks-prompt-editor', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('blocks-prompt-editor')).toBe(BlocksPromptEditorElement);
  });

  it('has a value property defaulting to empty string', () => {
    const el = new BlocksPromptEditorElement();
    expect(el.value).toBe('');
  });

  it('has aria-label on textarea', async () => {
    const el = new BlocksPromptEditorElement();
    document.body.appendChild(el);
    await el.updateComplete;
    const textarea = el.shadowRoot!.querySelector('textarea');
    expect(textarea?.getAttribute('aria-label')).toBe('Prompt editor');
    el.remove();
  });
});

describe('blocks-json-editor', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('blocks-json-editor')).toBe(BlocksJsonEditorElement);
  });

  it('renders JSON value as formatted text', async () => {
    const el = new BlocksJsonEditorElement();
    el.value = { key: 'val' };
    document.body.appendChild(el);
    await el.updateComplete;
    const pre = el.shadowRoot!.querySelector('pre');
    expect(pre?.textContent).toContain('"key"');
    expect(pre?.getAttribute('role')).toBe('region');
    expect(pre?.getAttribute('aria-label')).toBe('JSON viewer');
    el.remove();
  });
});
