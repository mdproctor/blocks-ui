import type { StencilDescriptor } from '@casehubio/graph-core';

export const bindingStencil: StencilDescriptor = {
  grammar: {
    type: 'binding',
    label: 'Binding',
    icon: 'link',
    containment: {
      canContain: [],
      canBeContainedBy: ['worker'],
    },
    connections: {
      inbound: { min: 0, max: Infinity, allowedFrom: ['worker', 'milestone'] },
      outbound: { min: 1, max: 1, allowedTo: ['worker'] },
    },
  },
  properties: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Binding name' },
      capability: { type: 'string', description: 'Target capability' },
      when: { type: 'string', description: 'Activation condition (JQ expression)' },
    },
    required: ['name'],
  },
};

export const workerStencil: StencilDescriptor = {
  grammar: {
    type: 'worker',
    label: 'Worker',
    icon: 'cpu',
    containment: {
      canContain: ['binding'],
      canBeContainedBy: [],
    },
    connections: {
      inbound: { min: 0, max: Infinity, allowedFrom: ['binding'] },
      outbound: { min: 0, max: Infinity, allowedTo: ['binding'] },
    },
  },
  properties: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Worker name' },
      description: { type: 'string' },
      capabilities: { type: 'array', items: { type: 'string' } },
    },
    required: ['name'],
  },
};

export const milestoneStencil: StencilDescriptor = {
  grammar: {
    type: 'milestone',
    label: 'Milestone',
    icon: 'diamond',
    containment: {
      canContain: [],
      canBeContainedBy: [],
    },
    connections: {
      inbound: { min: 0, max: Infinity, allowedFrom: ['binding', 'goal'] },
      outbound: { min: 0, max: Infinity, allowedTo: ['binding'] },
    },
  },
  properties: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Milestone name' },
      condition: { type: 'string', description: 'Achievement condition (JQ expression)' },
    },
    required: ['name'],
  },
};

export const goalStencil: StencilDescriptor = {
  grammar: {
    type: 'goal',
    label: 'Goal',
    icon: 'flag',
    containment: {
      canContain: [],
      canBeContainedBy: [],
    },
    connections: {
      inbound: { min: 0, max: Infinity, allowedFrom: ['milestone', 'binding'] },
      outbound: { min: 0, max: 0, allowedTo: [] },
    },
  },
  properties: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Goal name' },
      kind: { type: 'string', enum: ['success', 'failure'], description: 'Goal outcome type' },
      condition: { type: 'string', description: 'Goal condition (JQ expression)' },
    },
    required: ['name', 'kind'],
  },
};

export const subCaseStencil: StencilDescriptor = {
  grammar: {
    type: 'subcase',
    label: 'SubCase',
    icon: 'layers',
    containment: {
      canContain: [],
      canBeContainedBy: [],
    },
    connections: {
      inbound: { min: 0, max: Infinity, allowedFrom: ['binding'] },
      outbound: { min: 0, max: 0, allowedTo: [] },
    },
  },
  properties: {
    type: 'object',
    properties: {
      namespace: { type: 'string' },
      name: { type: 'string' },
      version: { type: 'string' },
    },
    required: ['namespace', 'name'],
  },
};

export const caseStencils: StencilDescriptor[] = [
  bindingStencil,
  workerStencil,
  milestoneStencil,
  goalStencil,
  subCaseStencil,
];
