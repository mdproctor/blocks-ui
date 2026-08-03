import { describe, it, expect } from 'vitest';
import { applyPropertyEdit } from './yaml-editor.js';

const SAMPLE_YAML = `dsl: "1.0.0"
namespace: test
name: sample
version: "1.0.0"
spec:
  bindings:
    - name: scan
      capability: ocr
      when: '.doc != null'
      on:
        contextChange:
          filter: '.doc != null'
  workers:
    - name: ocr-worker
      capabilities:
        - ocr
  milestones:
    - name: extracted
      condition: '.result != null'
`;

describe('applyPropertyEdit', () => {
  it('updates a string property', () => {
    const result = applyPropertyEdit(
      SAMPLE_YAML,
      ['spec', 'bindings', 0],
      ['when'],
      '.ocrResult != null',
    );
    expect(result).toContain('.ocrResult != null');
    expect(result).toContain('name: scan');
  });

  it('preserves formatting of untouched sections', () => {
    const result = applyPropertyEdit(
      SAMPLE_YAML,
      ['spec', 'bindings', 0],
      ['when'],
      '.changed',
    );
    expect(result).toContain('namespace: test');
    expect(result).toContain('dsl: "1.0.0"');
    expect(result).toContain('capabilities:\n        - ocr');
  });

  it('updates a nested property via array path', () => {
    const result = applyPropertyEdit(
      SAMPLE_YAML,
      ['spec', 'milestones', 0],
      ['condition'],
      '.done == true',
    );
    expect(result).toContain('.done == true');
  });

  it('coerces number values', () => {
    const yaml = SAMPLE_YAML + '  goals:\n    - name: g1\n      retries: 3\n';
    const result = applyPropertyEdit(
      yaml,
      ['spec', 'goals', 0],
      ['retries'],
      5,
    );
    expect(result).toContain('retries: 5');
  });

  it('deletes key when value is undefined', () => {
    const result = applyPropertyEdit(
      SAMPLE_YAML,
      ['spec', 'bindings', 0],
      ['when'],
      undefined,
    );
    expect(result).not.toContain('when:');
    expect(result).toContain('name: scan');
  });

  it('handles deep nested path', () => {
    const yaml = `dsl: "1.0.0"
namespace: test
name: sample
version: "1.0.0"
spec:
  bindings:
    - name: b1
      outcomePolicy:
        onDecline: REROUTE
        maxRerouteAttempts: 3
`;
    const result = applyPropertyEdit(
      yaml,
      ['spec', 'bindings', 0],
      ['outcomePolicy', 'onDecline'],
      'FAULT',
    );
    expect(result).toContain('onDecline: FAULT');
    expect(result).toContain('maxRerouteAttempts: 3');
  });
});
