// databaseNode.js

import { BaseNode } from './BaseNode';

export const DatabaseNode = ({ id, data }) => {
  const config = {
    title: 'Database',
    icon: '🗄️',
    accent: '#FBBF24',
    width: 220,
    minHeight: 140,
    fields: [
      {
        name: 'query',
        label: 'Query',
        type: 'textarea',
        defaultValue: 'SELECT * FROM table',
        placeholder: 'Enter SQL query',
        rows: 3
      },
      {
        name: 'connection',
        label: 'Connection',
        type: 'text',
        defaultValue: 'default',
        placeholder: 'Connection name'
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
