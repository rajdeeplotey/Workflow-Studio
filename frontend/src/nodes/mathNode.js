// mathNode.js

import { BaseNode } from './BaseNode';

export const MathNode = ({ id, data }) => {
  const config = {
    title: 'Math',
    icon: '🔢',
    accent: '#60A5FA',
    width: 220,
    minHeight: 140,
    fields: [
      {
        name: 'operation',
        label: 'Operation',
        type: 'select',
        defaultValue: 'add',
        options: [
          { value: 'add', label: 'Add (+)' },
          { value: 'subtract', label: 'Subtract (-)' },
          { value: 'multiply', label: 'Multiply (*)' },
          { value: 'divide', label: 'Divide (/)' },
          { value: 'modulo', label: 'Modulo (%)' }
        ]
      },
      {
        name: 'operand',
        label: 'Operand',
        type: 'number',
        defaultValue: 0,
        placeholder: 'Enter number'
      }
    ],
    handles: [
      {
        id: `${id}-input`,
        type: 'target',
        position: 'left',
        label: 'input'
      },
      {
        id: `${id}-result`,
        type: 'source',
        position: 'right',
        label: 'result'
      }
    ]
  };

  return <BaseNode id={id} data={data} config={config} />;
};
