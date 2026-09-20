import type { ManifestPreset } from './types.js';

export const BUILT_IN_PRESETS: ManifestPreset[] = [
  {
    id: 'anthropic-production',
    name: 'Anthropic Production',
    description: 'Claude models for production use',
    manifest: {
      providers: [{ vendor: 'anthropic', credential: 'env:ANTHROPIC_API_KEY' }],
      models: [
        { id: 'claude-opus-5', displayName: 'Claude Opus 5', tier: 'FLAGSHIP', contextWindow: 1000000, costTier: 'PREMIUM' },
        { id: 'claude-sonnet-5', displayName: 'Claude Sonnet 5', tier: 'STANDARD', contextWindow: 200000, costTier: 'MEDIUM' },
        { id: 'claude-haiku-4-5', displayName: 'Claude Haiku 4.5', tier: 'FAST', contextWindow: 200000, costTier: 'LOW' },
      ],
      aliases: {
        'reasoning-heavy': { tier: 'FLAGSHIP', capabilities: ['reasoning', 'code'] },
        'general': { tier: 'STANDARD' },
        'fast': { tier: 'FAST' },
      },
      defaults: { backend: 'claude' },
    },
  },
  {
    id: 'openai-standard',
    name: 'OpenAI Standard',
    description: 'GPT models for general use',
    manifest: {
      providers: [{ vendor: 'openai', credential: 'env:OPENAI_API_KEY' }],
      models: [
        { id: 'gpt-4o', displayName: 'GPT-4o', tier: 'STANDARD', contextWindow: 128000, costTier: 'MEDIUM' },
        { id: 'gpt-4o-mini', displayName: 'GPT-4o Mini', tier: 'FAST', contextWindow: 128000, costTier: 'LOW' },
      ],
      defaults: { backend: 'openai' },
    },
  },
  {
    id: 'local-ollama',
    name: 'Local Development (Ollama)',
    description: 'Local models via Ollama — no API key needed',
    manifest: {
      providers: [{ vendor: 'ollama', host: 'http://localhost:11434' }],
      localModels: [{ id: 'llama3.1', backendKey: 'ollama', host: 'http://localhost:11434' }],
      defaults: { backend: 'ollama' },
    },
  },
  {
    id: 'multi-provider',
    name: 'Multi-Provider',
    description: 'Anthropic + OpenAI — route by capability',
    manifest: {
      providers: [
        { vendor: 'anthropic', credential: 'env:ANTHROPIC_API_KEY' },
        { vendor: 'openai', credential: 'env:OPENAI_API_KEY' },
      ],
      models: [
        { id: 'claude-sonnet-5', displayName: 'Claude Sonnet 5', vendor: 'anthropic', tier: 'STANDARD', contextWindow: 200000, costTier: 'MEDIUM' },
        { id: 'gpt-4o', displayName: 'GPT-4o', vendor: 'openai', tier: 'STANDARD', contextWindow: 128000, costTier: 'MEDIUM' },
      ],
      aliases: {
        'reasoning-heavy': { tier: 'FLAGSHIP', preferVendor: 'anthropic' },
        'general': { tier: 'STANDARD' },
      },
    },
  },
];
