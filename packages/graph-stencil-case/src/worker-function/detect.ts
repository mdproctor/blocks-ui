import type { WorkerFunctionType, McpTransportType, ModelProviderKey } from './types.js';
import { FUNCTION_TYPE_KEYS, CORE_WORKER_KEYS, MODEL_PROVIDERS } from './types.js';

export function detectFunctionType(
  data: Record<string, unknown>,
): WorkerFunctionType {
  if (data['agent'] != null) return 'agent';
  if (data['do'] != null) return 'flow';
  if (data['a2a'] != null) return 'a2a';
  if (data['mcp'] != null) return 'mcp';
  if (data['sequence'] != null) return 'sequence';
  const hasUnknown = Object.keys(data).some(
    k => !CORE_WORKER_KEYS.has(k) && !(FUNCTION_TYPE_KEYS as readonly string[]).includes(k),
  );
  return hasUnknown ? 'unknown' : 'external';
}

export function detectMcpTransport(
  mcp: Record<string, unknown>,
): McpTransportType | null {
  if (mcp['command'] != null) return 'stdio';
  if (mcp['url'] != null) return 'http';
  return null;
}

export function detectModelProvider(
  model: Record<string, unknown>,
): ModelProviderKey | null {
  for (const key of MODEL_PROVIDERS) {
    if (model[key] != null) return key;
  }
  return null;
}
