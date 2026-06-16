'use client';

import type { Node } from '@xyflow/react';

export const NODES = [
  {
    id: 'number',
    name: 'Number',
    category: 'Basic',
    inputs: [],
    outputs: [{ id: 'out', name: 'Value' }],
    defaultState: { value: 42 },
  },
  {
    id: 'sum',
    name: 'Sum',
    category: 'Basic',
    inputs: [
      { id: 'inp1', name: 'Value 1' },
      { id: 'inp2', name: 'Value 2' },
    ],
    outputs: [{ id: 'out', name: 'Value' }],
    defaultState: {},
  },
];

export function createNode(definitionId: string, position = { x: 250, y: 200 }): Node {
  const definition = NODES.find((d) => d.id === definitionId);

  if (!definition) {
    throw new Error(`Unknown node definition: ${definitionId}`);
  }

  return {
    id: crypto.randomUUID(),
    type: 'customNode',
    position,
    data: {
      label: definition.name,
      state: { ...(definition.defaultState ?? {}) },
      _definition: {
        id: definition.id,
        name: definition.name,
      },
      inputs: definition.inputs,
      outputs: definition.outputs,
    },
  };
}
