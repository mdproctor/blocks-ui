import { describe, it, expect } from 'vitest';
import { parseCredentialRef, formatCredentialRef } from './manifest.js';
import type { Manifest, CredentialRef } from './manifest.js';

describe('parseCredentialRef', () => {
  it('parses env: prefix', () => {
    const ref = parseCredentialRef('env:ANTHROPIC_API_KEY');
    expect(ref).toEqual({ type: 'env', name: 'ANTHROPIC_API_KEY' });
  });

  it('parses file: prefix', () => {
    const ref = parseCredentialRef('file:/etc/secrets/key');
    expect(ref).toEqual({ type: 'file', path: '/etc/secrets/key' });
  });

  it('parses ref: prefix', () => {
    const ref = parseCredentialRef('ref:vault-anthropic');
    expect(ref).toEqual({ type: 'ref', name: 'vault-anthropic' });
  });

  it('defaults to env for unprefixed string', () => {
    const ref = parseCredentialRef('MY_KEY');
    expect(ref).toEqual({ type: 'env', name: 'MY_KEY' });
  });
});

describe('formatCredentialRef', () => {
  it('round-trips env ref', () => {
    const ref: CredentialRef = { type: 'env', name: 'KEY' };
    expect(formatCredentialRef(ref)).toBe('env:KEY');
    expect(parseCredentialRef(formatCredentialRef(ref))).toEqual(ref);
  });

  it('round-trips file ref', () => {
    const ref: CredentialRef = { type: 'file', path: '/tmp/key' };
    expect(formatCredentialRef(ref)).toBe('file:/tmp/key');
    expect(parseCredentialRef(formatCredentialRef(ref))).toEqual(ref);
  });

  it('round-trips ref ref', () => {
    const ref: CredentialRef = { type: 'ref', name: 'vault-key' };
    expect(formatCredentialRef(ref)).toBe('ref:vault-key');
    expect(parseCredentialRef(formatCredentialRef(ref))).toEqual(ref);
  });
});

describe('Manifest type', () => {
  it('accepts a valid manifest with arrays', () => {
    const manifest: Manifest = {
      providers: [{ vendor: 'anthropic', credential: 'env:ANTHROPIC_API_KEY' }],
      models: [{ id: 'claude-sonnet-5', tier: 'FLAGSHIP', contextWindow: 200000 }],
      aliases: { 'reasoning-heavy': { tier: 'FLAGSHIP', capabilities: ['reasoning'] } },
    };
    expect(manifest.providers).toHaveLength(1);
    expect(manifest.models![0]!.tier).toBe('FLAGSHIP');
  });

  it('accepts map credential on provider', () => {
    const manifest: Manifest = {
      providers: [{ vendor: 'vertex', credential: { projectId: 'my-proj', region: 'us-central1' } }],
    };
    expect(typeof manifest.providers![0]!.credential).toBe('object');
  });
});
