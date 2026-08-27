import { describe, it, expect } from 'vitest';
import { registerPropertySchema, getPropertySchema } from './schema-registry.js';

describe('schema-registry', () => {
  it('returns undefined for unregistered type', () => {
    expect(getPropertySchema('nonexistent-type')).toBeUndefined();
  });

  it('registers and retrieves a schema', () => {
    const schema = { type: 'object', properties: { name: { type: 'string' } } };
    registerPropertySchema('test-node', schema);
    expect(getPropertySchema('test-node')).toBe(schema);
  });

  it('overwrites on re-registration', () => {
    const schema1 = { type: 'object', properties: { a: { type: 'string' } } };
    const schema2 = { type: 'object', properties: { b: { type: 'number' } } };
    registerPropertySchema('overwrite-test', schema1);
    registerPropertySchema('overwrite-test', schema2);
    expect(getPropertySchema('overwrite-test')).toBe(schema2);
  });
});
