// inputNode.js

import { BaseNode } from './BaseNode';

export const InputNode = ({ id, data }) => {
  const config = {
    title: 'Input',
    icon: '📥',
    accent: '#22D3EE',
    width: 220,
    minHeight: 150,
    fields: [
      {
        name: 'inputName',
        label: 'Name',
        type: 'text',
        defaultValue: (id) => id.replace('customInput-', 'input_'),
        placeholder: 'Enter input name'
      },
      {
        name: 'inputType',
        label: 'Type',
        type: 'select',
        defaultValue: 'Text',
        options: [
          { value: 'Text', label: 'Text' },
          { value: 'File', label: 'File' }
        ]
      },
      {
        name: 'value',
        label: 'Runtime Value',
        type: 'text',
        defaultValue: '',
        placeholder: 'Enter data value for execution'
      }
    ],
    handles: [
      {
        id: `${id}-value`,
        type: 'source',
        position: 'right',
        label: 'value'
      }
    ]
  };

  return <BaseNode id={id} data={data} config={config} />;
};
