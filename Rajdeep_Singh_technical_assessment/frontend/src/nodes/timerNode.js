// timerNode.js

import { BaseNode } from './BaseNode';

export const TimerNode = ({ id, data }) => {
  const config = {
    title: 'Timer',
    icon: '⏱️',
    accent: '#C084FC',
    width: 220,
    minHeight: 120,
    fields: [
      {
        name: 'delay',
        label: 'Delay (seconds)',
        type: 'number',
        defaultValue: 1,
        step: 0.1,
        placeholder: 'Enter delay in seconds'
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
        id: `${id}-output`,
        type: 'source',
        position: 'right',
        label: 'output'
      }
    ]
  };

  return <BaseNode id={id} data={data} config={config} />;
};
