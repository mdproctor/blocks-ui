import { describe, it, expect } from 'vitest';
import { detectFunctionType, detectMcpTransport, detectModelProvider } from './detect.js';

describe('detectFunctionType', () => {
  it('detects agent', () => {
    expect(detectFunctionType({ name: 'w', capabilities: [], agent: { systemPrompt: '' } })).toBe('agent');
  });

  it('detects flow from do key', () => {
    expect(detectFunctionType({ name: 'w', capabilities: [], do: [] })).toBe('flow');
  });

  it('detects a2a', () => {
    expect(detectFunctionType({ name: 'w', capabilities: [], a2a: { endpoint: '' } })).toBe('a2a');
  });

  it('detects mcp', () => {
    expect(detectFunctionType({ name: 'w', capabilities: [], mcp: { command: [] } })).toBe('mcp');
  });

  it('detects sequence', () => {
    expect(detectFunctionType({ name: 'w', capabilities: [], sequence: ['a', 'b'] })).toBe('sequence');
  });

  it('returns external when no function key', () => {
    expect(detectFunctionType({ name: 'w', capabilities: [] })).toBe('external');
  });

  it('returns unknown when unrecognised key present', () => {
    expect(detectFunctionType({ name: 'w', capabilities: [], grpc: { endpoint: '' } })).toBe('unknown');
  });

  it('first known key wins when multiple present', () => {
    expect(detectFunctionType({ name: 'w', capabilities: [], agent: {}, do: [] })).toBe('agent');
  });

  it('ignores core worker keys when checking for unknown', () => {
    expect(detectFunctionType({ name: 'w', capabilities: [], description: 'hi', executionPolicy: {} })).toBe('external');
  });
});

describe('detectMcpTransport', () => {
  it('detects stdio', () => {
    expect(detectMcpTransport({ command: ['/bin/tool'] })).toBe('stdio');
  });

  it('detects http', () => {
    expect(detectMcpTransport({ url: 'https://example.com' })).toBe('http');
  });

  it('returns null for malformed config', () => {
    expect(detectMcpTransport({})).toBeNull();
  });
});

describe('detectModelProvider', () => {
  it('detects openai', () => {
    expect(detectModelProvider({ openai: { modelName: 'gpt-4' } })).toBe('openai');
  });

  it('detects anthropic', () => {
    expect(detectModelProvider({ anthropic: { modelName: 'claude-3' } })).toBe('anthropic');
  });

  it('detects ollama', () => {
    expect(detectModelProvider({ ollama: { modelName: 'llama3' } })).toBe('ollama');
  });

  it('detects mistralAi', () => {
    expect(detectModelProvider({ mistralAi: { modelName: 'mistral-large' } })).toBe('mistralAi');
  });

  it('detects googleAiGemini', () => {
    expect(detectModelProvider({ googleAiGemini: { modelName: 'gemini-pro' } })).toBe('googleAiGemini');
  });

  it('returns null for empty model', () => {
    expect(detectModelProvider({})).toBeNull();
  });
});
