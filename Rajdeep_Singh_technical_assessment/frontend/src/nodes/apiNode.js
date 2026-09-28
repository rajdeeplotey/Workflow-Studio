// apiNode.js

import { BaseNode } from './BaseNode';

export const ApiNode = ({ id, data }) => {
  const config = {
    title: 'API Request',
    icon: '🌐',
    accent: '#38BDF8',
    width: 220,
    minHeight: 160,
    fields: [
      {
        name: 'method',
        label: 'Method',
        type: 'select',
        defaultValue: 'GET',
        options: [
          { value: 'GET', label: 'GET' },
          { value: 'POST', label: 'POST' },
          { value: 'PUT', label: 'PUT' },
          { value: 'DELETE', label: 'DELETE' }
        ]
      },
      {
        name: 'url',
        label: 'URL',
        type: 'text',
        defaultValue: '',
        placeholder: 'https://api.example.com'
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
        id: `${id}-response`,
        type: 'source',
        position: 'right',
        label: 'response'
      }
    ]
  };

  return <BaseNode id={id} data={data} config={config} />;
};
