// textNode.js

import { useState, useEffect, useRef, useMemo } from 'react';
import { useUpdateNodeInternals } from 'reactflow';
import { useStore } from '../store';
import { BaseNode } from './BaseNode';
import './BaseNode.css';

const VARIABLE_REGEX = /\{\{\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\}\}/g;

export const TextNode = ({ id, data }) => {
  const { updateNodeField } = useStore();
  const updateNodeInternals = useUpdateNodeInternals();
  const [text, setText] = useState(data?.text || '');
  const textareaRef = useRef(null);

  // Initialize with default if empty
  useEffect(() => {
    if (!data?.text) {
      updateNodeField(id, 'text', '{{input}}');
      setText('{{input}}');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync with store data
  useEffect(() => {
    if (data?.text !== undefined && data.text !== text) {
      setText(data.text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.text]);

  // Extract unique variables from text
  const variables = useMemo(() => {
    const matches = new Set();
    let match;
    const regex = new RegExp(VARIABLE_REGEX.source, 'g');
    while ((match = regex.exec(text)) !== null) {
      matches.add(match[1]);
    }
    return Array.from(matches);
  }, [text]);

  // Clean up dangling edges & update handle positions in ReactFlow
  useEffect(() => {
    updateNodeInternals(id);

    const validHandleIds = new Set(variables.map((v) => `var-${v}`));
    const currentEdges = useStore.getState().edges;
    const hasDangling = currentEdges.some(
      (edge) =>
        edge.target === id &&
        edge.targetHandle &&
        edge.targetHandle.startsWith('var-') &&
        !validHandleIds.has(edge.targetHandle)
    );

    if (hasDangling) {
      const updatedEdges = currentEdges.filter(
        (edge) =>
          !(
            edge.target === id &&
            edge.targetHandle &&
            edge.targetHandle.startsWith('var-') &&
            !validHandleIds.has(edge.targetHandle)
          )
      );
      useStore.setState({ edges: updatedEdges });
      useStore.getState().syncActiveWorkflow(useStore.getState().nodes, updatedEdges);
    }
  }, [text, id, variables, updateNodeInternals]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [text]);

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    updateNodeField(id, 'text', newText);
  };

  // Build variable target handles
  const variableHandles = variables.map((varName) => ({
    id: `var-${varName}`,
    type: 'target',
    position: 'left'
  }));

  // Combine with output source handle on right
  const handles = [
    ...variableHandles,
    {
      id: `${id}-output`,
      type: 'source',
      position: 'right'
    }
  ];

  // Calculate dynamic width and height
  const minWidth = 220;
  const dynamicWidth = Math.max(minWidth, Math.min(400, text.length * 8 + 60));
  const lineCount = Math.max(3, text.split('\n').length);
  const dynamicHeight = Math.max(100, lineCount * 24 + 70);

  const config = {
    title: 'Text',
    icon: '📝',
    accent: '#FB7185',
    width: dynamicWidth,
    minHeight: dynamicHeight,
    handles: handles,
    children: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label className="basenode-field-label">Text</label>
        <textarea
          ref={textareaRef}
          className="nodrag basenode-textarea"
          value={text}
          onChange={handleTextChange}
          placeholder="Enter text with {{variable}} placeholders"
          rows={3}
          style={{
            minHeight: '60px',
            overflow: 'hidden'
          }}
        />
        {variables.length > 0 && (
          <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
              Vars:
            </span>
            {variables.map((v) => (
              <span key={v} className="basenode-variable-badge">
                {v}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  };

  return <BaseNode id={id} data={data} config={config} />;
};


