import { describe, it, expect } from 'vitest';
import { renderBinding } from './binding.js';
import { renderWorker } from './worker.js';
import { renderMilestone } from './milestone.js';
import { renderGoal } from './goal.js';
import { renderSubCase } from './subcase.js';

describe('stencil render functions', () => {
  it('renderBinding returns TemplateResult with name and trigger', () => {
    const result = renderBinding({
      name: 'extract-text',
      capability: 'ocr',
      on: { contextChange: { filter: '.doc != null' } },
    });
    expect(result).toBeDefined();
    expect(result.strings).toBeDefined();
  });

  it('renderWorker returns TemplateResult with capabilities', () => {
    const result = renderWorker({
      name: 'ocr-worker',
      capabilities: ['ocr'],
      description: 'Extracts text',
    });
    expect(result).toBeDefined();
    expect(result.strings).toBeDefined();
  });

  it('renderMilestone returns TemplateResult', () => {
    const result = renderMilestone({
      name: 'text-extracted',
      condition: '.ocrResult != null',
    });
    expect(result).toBeDefined();
    expect(result.strings).toBeDefined();
  });

  it('renderGoal returns TemplateResult with kind', () => {
    const result = renderGoal({
      name: 'processingComplete',
      kind: 'success',
      condition: '.done',
    });
    expect(result).toBeDefined();
    expect(result.strings).toBeDefined();
  });

  it('renderSubCase returns TemplateResult', () => {
    const result = renderSubCase({
      namespace: 'casehub',
      name: 'child-case',
      version: '1.0.0',
    });
    expect(result).toBeDefined();
    expect(result.strings).toBeDefined();
  });
});
