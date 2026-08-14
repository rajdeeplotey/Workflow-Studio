// llmNode.js

import { useState, useEffect, useMemo } from 'react';
import { useUpdateNodeInternals } from 'reactflow';
import { useStore } from '../store';
import { BaseNode } from './BaseNode';
import './BaseNode.css';

const VARIABLE_REGEX = /\{\{\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\}\}/g;

export const LLMNode = ({ id, data }) => {
  const { updateNodeField } = useStore();
  const updateNodeInternals = useUpdateNodeInternals();

  const [systemPrompt, setSystemPrompt] = useState(data?.system || '');
  const [prompt, setPrompt] = useState(data?.prompt || '');
  const [toolsEnabled, setToolsEnabled] = useState(data?.tools_enabled || false);

  // Sync with store data
  useEffect(() => {
    if (data?.system !== undefined && data.system !== systemPrompt) {
      setSystemPrompt(data.system);
    }
    if (data?.prompt !== undefined && data.prompt !== prompt) {
      setPrompt(data.prompt);
    }
    if (data?.tools_enabled !== undefined && data.tools_enabled !== toolsEnabled) {
      setToolsEnabled(data.tools_enabled);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.system, data?.prompt, data?.tools_enabled]);

  // Extract variables from prompt template
  const variables = useMemo(() => {
    const matches = new Set();
    let match;
    const regex = new RegExp(VARIABLE_REGEX.source, 'g');
    while ((match = regex.exec(prompt)) !== null) {
      matches.add(match[1]);
    }
    return Array.from(matches);
  }, [prompt]);

  // Handle dynamic edges & ReactFlow handle updates
  useEffect(() => {
    updateNodeInternals(id);

    const validHandleIds = new Set([
      `${id}-system`,
      `${id}-prompt`,
      ...variables.map((v) => `var-${v}`)
    ]);

    const currentEdges = useStore.getState().edges;
    const hasDangling = currentEdges.some(
      (edge) =>
        edge.target === id &&
        edge.targetHandle &&
        !validHandleIds.has(edge.targetHandle)
    );

    if (hasDangling) {
      const updatedEdges = currentEdges.filter(
        (edge) =>
          !(
            edge.target === id &&
            edge.targetHandle &&
            !validHandleIds.has(edge.targetHandle)
          )
      );
      useStore.setState({ edges: updatedEdges });
      useStore.getState().syncActiveWorkflow(useStore.getState().nodes, updatedEdges);
    }
  }, [prompt, id, variables, updateNodeInternals]);

  const handleSystemChange = (e) => {
    const val = e.target.value;
    setSystemPrompt(val);
    updateNodeField(id, 'system', val);
  };

  const handlePromptChange = (e) => {
    const val = e.target.value;
    setPrompt(val);
    updateNodeField(id, 'prompt', val);
  };

  const handleToolsToggle = (e) => {
    const val = e.target.checked;
    setToolsEnabled(val);
    updateNodeField(id, 'tools_enabled', val);
  };

  // Build handle list: system, prompt, variables, and output response
  const handles = [
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
    ...variables.map((varName) => ({
      id: `var-${varName}`,
      type: 'target',
      position: 'left',
      label: varName
    })),
    {
      id: `${id}-response`,
      type: 'source',
      position: 'right',
      label: 'response'
    }
  ];

  const config = {
    title: 'LLM',
    icon: '🤖',
    accent: '#818CF8',
    width: 250,
    minHeight: 180,
    handles: handles,
    children: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div>
          <label className="basenode-field-label">System Prompt</label>
          <textarea
            className="nodrag basenode-textarea"
            value={systemPrompt}
            onChange={handleSystemChange}
            placeholder="e.g. You are a helpful assistant"
            rows={2}
          />
        </div>

        <div>
          <label className="basenode-field-label">User Prompt (supports &#123;&#123;variable&#125;&#125;)</label>
          <textarea
            className="nodrag basenode-textarea"
            value={prompt}
            onChange={handlePromptChange}
            placeholder="e.g. Summarize: {{input}}"
            rows={3}
          />
          {variables.length > 0 && (
            <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Vars:</span>
              {variables.map((v) => (
                <span key={v} className="basenode-variable-badge">{v}</span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
          <input
            type="checkbox"
            id={`${id}-tools`}
            checked={toolsEnabled}
            onChange={handleToolsToggle}
            className="nodrag"
            style={{ cursor: 'pointer' }}
          />
          <label htmlFor={`${id}-tools`} style={{ fontSize: '11px', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '500' }}>
            Enable Tool Calling (API / RAG)
          </label>
        </div>
      </div>
    )
  };

  return <BaseNode id={id} data={data} config={config} />;
};
