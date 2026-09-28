// llmNode.js

import { BaseNode } from './BaseNode';

export const LLMNode = ({ id, data }) => {
  const config = {
    title: 'LLM',
    icon: '🤖',
    accent: '#818CF8',
    width: 220,
    minHeight: 100,
    fields: [],
    handles: [
      {
        id: `${id}-system`,
        type: 'target',
        position: 'left',
        label: 'system'
      },
      {
        id: `${id}-prompt`,
        type: 'target',
        position: 'left',
        label: 'prompt'
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
