import type { StencilDescriptor } from '@casehubio/graph-core';

export const callStencil: StencilDescriptor = {
  grammar: {
    type: 'swf-call',
    label: 'Call',
    icon: 'phone',
    containment: { canContain: [], canBeContainedBy: [] },
    connections: {
      inbound: { min: 0, max: Infinity, allowedFrom: ['swf-call', 'swf-switch', 'swf-entry'] },
      outbound: { min: 0, max: 1, allowedTo: ['swf-call', 'swf-switch', 'swf-raise', 'swf-exit'] },
    },
  },
  properties: {
    type: 'object',
    properties: {
      call: { type: 'string', description: 'Function to call' },
      with: { type: 'object', description: 'Call arguments' },
    },
    required: ['call'],
  },
};

export const switchStencil: StencilDescriptor = {
  grammar: {
    type: 'swf-switch',
    label: 'Switch',
    icon: 'git-branch',
    containment: { canContain: [], canBeContainedBy: [] },
    connections: {
      inbound: { min: 0, max: Infinity, allowedFrom: ['swf-call', 'swf-switch', 'swf-entry'] },
      outbound: { min: 1, max: Infinity, allowedTo: ['swf-call', 'swf-switch', 'swf-raise', 'swf-exit'] },
    },
  },
  properties: {
    type: 'object',
    properties: {
      switch: { type: 'array', description: 'Switch conditions' },
    },
  },
};

export const swfStencils: StencilDescriptor[] = [
  callStencil,
  switchStencil,
  // TODO: raise, catch, entry, exit stencils
];
