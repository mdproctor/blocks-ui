import type { AgentDisposition, DispositionAxis } from '@casehubio/blocks-ui-core';
import { primaryTerm, DISPOSITION_AXES } from '@casehubio/blocks-ui-core';
import type { AvatarFeatures } from './types.js';

export const NEUTRAL_FEATURES: Readonly<AvatarFeatures> = {
  mouth: 'default',
  eyes: 'default',
  eyebrows: 'default',
  clothing: 'collarAndSweater',
  accessories: 'blank',
  top: 'shortCurly',
  skinColor: 'light',
};

type TermMapping = Record<string, Partial<AvatarFeatures>>;
type AxisMapping = Record<DispositionAxis, TermMapping>;

const AXIS_MAPPINGS: AxisMapping = {
  socialOrient: {
    collaborative: { mouth: 'smile', eyes: 'happy' },
    competitive: { mouth: 'serious', eyes: 'squint' },
    independent: { mouth: 'default', eyes: 'default' },
  },
  ruleFollowing: {
    strict: { eyebrows: 'defaultNatural', clothing: 'blazerAndShirt' },
    adaptive: { eyebrows: 'default', clothing: 'collarAndSweater' },
    creative: { eyebrows: 'raisedExcited', clothing: 'graphicShirt' },
  },
  riskAppetite: {
    adventurous: { accessories: 'sunglasses', clothing: 'hoodie' },
    moderate: { accessories: 'blank', clothing: 'collarAndSweater' },
    cautious: { accessories: 'prescription02', clothing: 'blazerAndShirt' },
  },
  autonomy: {
    'fully-autonomous': { top: 'shortFlat', facialHair: 'blank' },
    'semi-autonomous': { top: 'shortCurly', facialHair: 'blank' },
    directed: { top: 'shortRound', facialHair: 'blank' },
  },
  conflictMode: {
    assertive: { eyebrows: 'angryNatural', mouth: 'serious' },
    diplomatic: { eyebrows: 'default', mouth: 'smile' },
    avoidant: { eyebrows: 'sadConcerned', mouth: 'concerned' },
  },
};

export function resolveFeatures(disposition: AgentDisposition): AvatarFeatures {
  const result: AvatarFeatures = { ...NEUTRAL_FEATURES };

  for (const axis of DISPOSITION_AXES) {
    const term = primaryTerm(disposition, axis);
    if (!term) continue;

    const mapping = AXIS_MAPPINGS[axis];
    const features = mapping[term.term];
    if (features) {
      Object.assign(result, features);
    }
  }

  return result;
}
