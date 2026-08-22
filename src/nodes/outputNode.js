// outputNode.js

import { BaseNode } from './BaseNode';

export const OutputNode = ({ id, data }) => {
  const config = {
    title: 'Output',
    icon: '📤',
    accent: '#FBBF24',
    width: 220,
    minHeight: 120,
    fields: [
      {
        name: 'outputName',
        label: 'Name',
        type: 'text',
        defaultValue: (id) => id.replace('customOutput-', 'output_'),
        placeholder: 'Enter output name'
      },
      {
        name: 'outputType',
        label: 'Type',
        type: 'select',
        defaultValue: 'Text',
        options: [
          { value: 'Text', label: 'Text' },
          { value: 'Image', label: 'Image' }
        ]
      }
    ],
    handles: [
      {
        id: `${id}-value`,
        type: 'target',
        position: 'left',
        label: 'value'
      }
    ]
  };

  return <BaseNode id={id} data={data} config={config} />;
};
