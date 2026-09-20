import { describe, it, expect } from 'vitest';
import { resolveFeatures, NEUTRAL_FEATURES } from './canonical-registry.js';
import type { AgentDisposition } from '@casehubio/blocks-ui-core';

describe('resolveFeatures', () => {
  it('returns neutral features for empty disposition', () => {
    const features = resolveFeatures({});
    expect(features).toEqual(NEUTRAL_FEATURES);
  });

  it('maps collaborative socialOrient to smile', () => {
    const disposition: AgentDisposition = {
      socialOrient: [{ term: 'collaborative', weight: 1.0 }],
    };
    const features = resolveFeatures(disposition);
    expect(features.mouth).toBe('smile');
    expect(features.eyes).toBe('happy');
  });

  it('maps cautious riskAppetite to glasses', () => {
    const disposition: AgentDisposition = {
      riskAppetite: [{ term: 'cautious', weight: 1.0 }],
    };
    const features = resolveFeatures(disposition);
    expect(features.accessories).toBe('prescription02');
    expect(features.clothing).toBe('blazerAndShirt');
  });

  it('uses primary term for multi-term axis', () => {
    const disposition: AgentDisposition = {
      socialOrient: [
        { term: 'collaborative', weight: 0.7 },
        { term: 'competitive', weight: 0.3 },
      ],
    };
    const features = resolveFeatures(disposition);
    expect(features.mouth).toBe('smile');
  });

  it('falls back to neutral for unknown vocabulary term', () => {
    const disposition: AgentDisposition = {
      socialOrient: [{ term: 'dialectical-engagement', weight: 1.0 }],
    };
    const features = resolveFeatures(disposition);
    expect(features.mouth).toBe(NEUTRAL_FEATURES.mouth);
  });

  it('combines features from multiple axes', () => {
    const disposition: AgentDisposition = {
      socialOrient: [{ term: 'collaborative', weight: 1.0 }],
      riskAppetite: [{ term: 'cautious', weight: 1.0 }],
      ruleFollowing: [{ term: 'strict', weight: 1.0 }],
    };
    const features = resolveFeatures(disposition);
    expect(features.mouth).toBe('smile');
    expect(features.accessories).toBe('prescription02');
    expect(features.eyebrows).toBe('defaultNatural');
  });
});
