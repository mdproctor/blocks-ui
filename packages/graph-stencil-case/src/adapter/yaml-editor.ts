import { parseDocument } from 'yaml';

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
