import { parseDocument, parse as parseYaml, type YAMLMap } from 'yaml';
import type { WorkerFunctionType, McpTransportType, ModelProviderKey } from '../worker-function/types.js';
import { FUNCTION_TYPE_KEYS, FUNCTION_TYPE_TO_YAML_KEY, MODEL_PROVIDERS } from '../worker-function/types.js';
import { FUNCTION_TYPE_DEFAULTS, MCP_TRANSPORT_DEFAULTS, PROVIDER_DEFAULT } from '../worker-function/defaults.js';

export function applyPropertyEdit(
  yaml: string,
  nodePath: readonly (string | number)[],
  field: readonly (string | number)[],
  value: unknown,
): string {
  const doc = parseDocument(yaml);
  const fullPath = [...nodePath, ...field];

  if (value === undefined) {
    doc.deleteIn(fullPath);
  } else {
    doc.setIn(fullPath, value);
  }

  return doc.toString();
}

const ELEMENT_PATHS: Record<string, string> = {
  binding: 'bindings',
  worker: 'workers',
  milestone: 'milestones',
  goal: 'goals',
};

const ELEMENT_DEFAULTS: Record<string, (n: number) => Record<string, unknown>> = {
  binding: (n) => ({ name: `binding-${n}`, capability: '' }),
  worker: (n) => ({ name: `worker-${n}`, capabilities: [] }),
  milestone: (n) => ({ name: `milestone-${n}` }),
  goal: (n) => ({ name: `goal-${n}`, kind: 'success' }),
};

export function addElement(
  yaml: string,
  elementType: 'binding' | 'worker' | 'milestone' | 'goal',
  defaults?: Record<string, unknown>,
): string {
  const doc = parseDocument(yaml);
  const arrayKey = ELEMENT_PATHS[elementType]!;
  const specPath = ['spec', arrayKey];

  const parsed = parseYaml(yaml) as { spec: Record<string, Array<{ name?: string }>> };
  const existing = parsed.spec?.[arrayKey] ?? [];
  const existingNames = new Set(existing.map((e: { name?: string }) => String(e.name ?? '')));

  let n = 1;
  while (existingNames.has(`${elementType}-${n}`)) n++;

  const generated = ELEMENT_DEFAULTS[elementType]!(n);
  const merged = defaults ? { ...generated, ...defaults } : generated;

  const seq = doc.getIn(specPath);
  if (!seq) {
    doc.setIn(specPath, [merged]);
  } else {
    doc.addIn(specPath, merged);
  }
  return doc.toString();
}

export function removeElement(
  yaml: string,
  nodePath: readonly (string | number)[],
): string {
  const doc = parseDocument(yaml);
  doc.deleteIn([...nodePath]);
  return doc.toString();
}

const TARGET_DEFAULTS: Record<string, unknown> = {
  capability: '',
  subCase: { namespace: '', name: '' },
  humanTask: { title: '' },
};

export function switchBindingTarget(
  yaml: string,
  bindingPath: readonly (string | number)[],
  targetType: 'capability' | 'subCase' | 'humanTask',
): string {
  const doc = parseDocument(yaml);
  for (const key of ['capability', 'subCase', 'humanTask']) {
    doc.deleteIn([...bindingPath, key]);
  }
  doc.setIn([...bindingPath, targetType], TARGET_DEFAULTS[targetType]);
  return doc.toString();
}

export function switchFunctionType(
  yaml: string,
  nodePath: readonly (string | number)[],
  newType: WorkerFunctionType,
): string {
  const doc = parseDocument(yaml);
  const node = doc.getIn(nodePath) as YAMLMap;
  for (const key of FUNCTION_TYPE_KEYS) {
    if (node.has(key)) node.delete(key);
  }
  const yamlKey = FUNCTION_TYPE_TO_YAML_KEY[newType];
  if (yamlKey != null) {
    const defaultValue = FUNCTION_TYPE_DEFAULTS[newType];
    node.set(yamlKey, doc.createNode(defaultValue));
  }
  return doc.toString();
}

export function switchMcpTransport(
  yaml: string,
  nodePath: readonly (string | number)[],
  newTransport: McpTransportType,
): string {
  const doc = parseDocument(yaml);
  const mcpPath = [...nodePath, 'mcp'];
  const mcp = doc.getIn(mcpPath) as YAMLMap;
  for (const key of ['command', 'env', 'url', 'auth']) {
    if (mcp.has(key)) mcp.delete(key);
  }
  const defaults = MCP_TRANSPORT_DEFAULTS[newTransport];
  for (const [k, v] of Object.entries(defaults)) {
    mcp.set(k, doc.createNode(v));
  }
  return doc.toString();
}

export function switchModelProvider(
  yaml: string,
  nodePath: readonly (string | number)[],
  newProvider: ModelProviderKey,
): string {
  const doc = parseDocument(yaml);
  const modelPath = [...nodePath, 'agent', 'model'];
  const model = doc.getIn(modelPath) as YAMLMap;
  for (const key of MODEL_PROVIDERS) {
    if (model.has(key)) model.delete(key);
  }
  model.set(newProvider, doc.createNode(PROVIDER_DEFAULT));
  return doc.toString();
}
