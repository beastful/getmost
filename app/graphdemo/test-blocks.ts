// test-blocks.ts
import { type NodeDefinition } from './store';

export const testBlocks: NodeDefinition[] = [
  {
    name: 'Number',
    category: 'Input',
    icon: '🔢',
    outputs: [
      {
        id: 'value',
        name: 'Value',
        template: ['$input_field', 'num', 0],
      },
    ],
    ui: ['div', { className: 'space-y-1' },
      ['label', { className: 'text-xs text-gray-400' }, 'Number: '],
      ['$input_field', 'num', 0],
    ],
  },
  {
    name: 'Add',
    category: 'Math',
    icon: '➕',
    outputs: [
      {
        id: 'sum',
        name: 'Sum',
        template: ['sum', ['$input', 'a', 0], ['$input', 'b', 0]],
      },
    ],
    ui: ['div', { className: 'space-y-1' },
      ['div', { className: 'text-xs text-gray-300' }, ['a → ', ['$use_input', 'a']]],
      ['div', { className: 'text-xs text-gray-300' }, ['b → ', ['$use_input', 'b']]],
    ],
  },
  {
    name: 'Multiply',
    category: 'Math',
    icon: '✖️',
    outputs: [
      {
        id: 'product',
        name: 'Product',
        template: ['multiply', ['$input', 'a', 1], ['$input', 'b', 1]],
      },
    ],
    ui: ['div', { className: 'space-y-1' },
      ['div', { className: 'text-xs text-gray-300' }, ['a → ', ['$use_input', 'a']]],
      ['div', { className: 'text-xs text-gray-300' }, ['b → ', ['$use_input', 'b']]],
    ],
  },
  {
    name: 'Sum with Var',
    category: 'Math',
    icon: '∑',
    outputs: [
      {
        id: 'result',
        name: 'Result',
        template: ['sum', ['$input', 'a', 0], ['$input', 'b', 0], ['$input_field', 'extra', 0]],
      },
    ],
    ui: ['div', { className: 'space-y-2' },
      ['div', { className: 'flex items-center gap-2' },
        ['label', { className: 'text-xs text-gray-400 whitespace-nowrap' }, 'Extra: '],
        ['$input_field', 'extra', 0],
      ],
      ['div', { className: 'flex items-center gap-2' },
        ['label', { className: 'text-xs text-gray-400 whitespace-nowrap' }, 'Preview: '],
        ['$use_input', 'extra'],
      ],
    ],
  },
  {
    name: 'Range',
    category: 'Array',
    icon: '📊',
    outputs: [
      {
        id: 'arr',
        name: 'Array',
        template: ['range', ['$input_field', 'start', 0], ['$input_field', 'end', 5]],
      },
    ],
    ui: ['div', { className: 'space-y-2' },
      ['div', { className: 'flex items-center gap-2' },
        ['label', { className: 'text-xs text-gray-400 whitespace-nowrap' }, 'Start: '],
        ['$input_field', 'start', 0],
      ],
      ['div', { className: 'flex items-center gap-2' },
        ['label', { className: 'text-xs text-gray-400 whitespace-nowrap' }, 'End: '],
        ['$input_field', 'end', 5],
      ],
    ],
  },
  {
    name: 'Map ×2',
    category: 'Array',
    icon: '🗺️',
    outputs: [
      {
        id: 'mapped',
        name: 'Mapped',
        template: [
          'map',
          ['$input', 'arr', []],
          ['lambda', ['x'], ['multiply', ['get_local', 'x'], 2]],
        ],
      },
    ],
    ui: ['div', { className: 'space-y-1' },
      ['div', { className: 'text-xs text-gray-300' }, ['array in → ', ['$use_input', 'arr']]],
    ],
  },
  {
    name: 'Execute',
    category: 'Control',
    icon: '▶️',
    outputs: [
      {
        id: 'result',
        name: 'Result',
        template: ['process', ['$input_template', 'expr']],
      },
    ],
    ui: ['div', { className: 'flex flex-col gap-2' },
      ['div', { className: 'text-xs text-gray-400' }, 'Execute template'],
      ['button', {
        className: 'px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-500 active:bg-blue-700 transition-colors',
        onClick: ['action', 'run'],
      }, '▶ Run'],
    ],
  },
  {
    name: 'Alert',
    category: 'Control',
    icon: '🔔',
    outputs: [
      {
        id: 'out',
        name: 'Out',
        template: ['alert', ['$input', 'value', 'no value']],
      },
    ],
    ui: ['div', { className: 'text-xs text-gray-400 py-1' }, 'Alert'],
  },
  {
    name: 'Console Log',
    category: 'Control',
    icon: '📋',
    outputs: [
      {
        id: 'out',
        name: 'Out',
        template: ['console_log', ['$input', 'value', 'no value']],
      },
    ],
    ui: ['div', { className: 'text-xs text-gray-400 py-1' }, 'Console Log'],
  },
];