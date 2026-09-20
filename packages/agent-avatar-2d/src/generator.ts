import { createAvatar } from '@dicebear/core';
import * as avataaars from '@dicebear/avataaars';
import type { AgentDisposition } from '@casehubio/blocks-ui-core';
import { resolveFeatures } from './canonical-registry.js';
import type { AvatarFeatures, AvatarConfig } from './types.js';

function featuresToOptions(features: AvatarFeatures): Record<string, string[]> {
  const opts: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(features)) {
    if (value) opts[key] = [value];
  }
  return opts;
}

export function generateAvatar(disposition: AgentDisposition): string {
  const features = resolveFeatures(disposition);
  const avatar = createAvatar(avataaars, { ...featuresToOptions(features), size: 128 });
  return avatar.toString();
}

export function generateCandidates(disposition: AgentDisposition): string[] {
  const baseFeatures = resolveFeatures(disposition);
  const candidates: string[] = [];

  const variations: Partial<AvatarFeatures>[] = [
    {},
    { top: 'longButNotTooLong' },
    { top: 'dreads' },
    { skinColor: 'tanned' },
    { skinColor: 'brown' },
    { skinColor: 'darkBrown' },
    { top: 'bob' },
    { top: 'bun' },
    { hairColor: 'auburn' },
    { hairColor: 'blonde' },
    { hairColor: 'black' },
    { hairColor: 'brown' },
  ];

  for (const variation of variations) {
    const features = { ...baseFeatures, ...variation };
    const avatar = createAvatar(avataaars, { ...featuresToOptions(features), size: 128 });
    candidates.push(avatar.toString());
  }

  return candidates;
}

export function customiseAvatar(base: AvatarConfig, overrides: Partial<AvatarFeatures>): string {
  const features = { ...base.features, ...base.overrides, ...overrides };
  const avatar = createAvatar(avataaars, { ...featuresToOptions(features), size: 128 });
  return avatar.toString();
}
