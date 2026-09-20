import { describe, it, expect } from 'vitest';
import { generateAvatar, generateCandidates, customiseAvatar } from './generator.js';
import type { AgentDisposition } from '@casehubio/blocks-ui-core';

describe('generateAvatar', () => {
  it('returns an SVG string', () => {
    const svg = generateAvatar({});
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('is deterministic — same disposition produces same SVG', () => {
    const disposition: AgentDisposition = {
      socialOrient: [{ term: 'collaborative', weight: 1.0 }],
    };
    const svg1 = generateAvatar(disposition);
    const svg2 = generateAvatar(disposition);
    expect(svg1).toBe(svg2);
  });

  it('produces different SVGs for different dispositions', () => {
    const svg1 = generateAvatar({ socialOrient: [{ term: 'collaborative', weight: 1.0 }] });
    const svg2 = generateAvatar({ socialOrient: [{ term: 'competitive', weight: 1.0 }] });
    expect(svg1).not.toBe(svg2);
  });
});

describe('generateCandidates', () => {
  it('returns an array of SVGs', () => {
    const candidates = generateCandidates({});
    expect(Array.isArray(candidates)).toBe(true);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.length).toBeLessThanOrEqual(20);
    for (const svg of candidates) {
      expect(svg).toContain('<svg');
    }
  });
});

describe('customiseAvatar', () => {
  it('applies overrides to base config', () => {
    const base = { features: { mouth: 'smile', eyes: 'happy' } };
    const svg = customiseAvatar(base, { mouth: 'serious' });
    expect(svg).toContain('<svg');
  });
});
