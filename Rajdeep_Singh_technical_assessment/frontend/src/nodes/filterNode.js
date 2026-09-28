// filterNode.js

import { BaseNode } from './BaseNode';

export const FilterNode = ({ id, data }) => {
  const config = {
    title: 'Filter',
    icon: '🔍',
    accent: '#34D399',
    width: 220,
    minHeight: 140,
    fields: [
      {
        name: 'condition',
        label: 'Condition',
        type: 'select',
        defaultValue: 'equals',
        options: [
          { value: 'equals', label: 'Equals' },
          { value: 'not_equals', label: 'Not Equals' },
          { value: 'contains', label: 'Contains' },
          { value: 'greater_than', label: 'Greater Than' },
          { value: 'less_than', label: 'Less Than' }
        ]
      },
      {
        name: 'value',
        label: 'Value',
        type: 'text',
        defaultValue: '',
        placeholder: 'Filter value'
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
        id: `${id}-pass`,
        type: 'source',
        position: 'right',
        label: 'pass'
      },
      {
        id: `${id}-fail`,
        type: 'source',
        position: 'right',
        label: 'fail'
      }
    ]
  };

  return <BaseNode id={id} data={data} config={config} />;
};
