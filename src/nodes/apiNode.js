// apiNode.js

import { useState, useEffect, useMemo } from 'react';
import { useUpdateNodeInternals } from 'reactflow';
import { useStore } from '../store';
import { BaseNode } from './BaseNode';
import './BaseNode.css';

const VARIABLE_REGEX = /\{\{\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\}\}/g;

export const ApiNode = ({ id, data }) => {
  const { updateNodeField } = useStore();
  const updateNodeInternals = useUpdateNodeInternals();

  const [method, setMethod] = useState(data?.method || 'GET');
  const [url, setUrl] = useState(data?.url || '');
  const [body, setBody] = useState(data?.body || '');

  useEffect(() => {
    if (data?.method !== undefined && data.method !== method) {
      setMethod(data.method);
    }
    if (data?.url !== undefined && data.url !== url) {
      setUrl(data.url);
    }
    if (data?.body !== undefined && data.body !== body) {
      setBody(data.body);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.method, data?.url, data?.body]);

  // Extract variables from both URL and Body
  const variables = useMemo(() => {
    const matches = new Set();
    const combined = `${url} ${body}`;
    let match;
    const regex = new RegExp(VARIABLE_REGEX.source, 'g');
    while ((match = regex.exec(combined)) !== null) {
      matches.add(match[1]);
    }
    return Array.from(matches);
  }, [url, body]);

  useEffect(() => {
    updateNodeInternals(id);

    const validHandleIds = new Set([
      `${id}-input`,
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
  }, [url, body, id, variables, updateNodeInternals]);

  const handleMethodChange = (e) => {
    const val = e.target.value;
    setMethod(val);
    updateNodeField(id, 'method', val);
  };

  const handleUrlChange = (e) => {
    const val = e.target.value;
    setUrl(val);
    updateNodeField(id, 'url', val);
  };

  const handleBodyChange = (e) => {
    const val = e.target.value;
    setBody(val);
    updateNodeField(id, 'body', val);
  };

  const handles = [
    {
      id: `${id}-input`,
      type: 'target',
      position: 'left',
      label: 'input'
    },
    ...variables.map((v) => ({
      id: `var-${v}`,
      type: 'target',
      position: 'left',
      label: v
    })),
    {
      id: `${id}-response`,
      type: 'source',
      position: 'right',
      label: 'response'
    }
  ];

  const config = {
    title: 'Tool / API',
    icon: '🌐',
    accent: '#38BDF8',
    width: 250,
    minHeight: 180,
    handles: handles,
    children: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div>
          <label className="basenode-field-label">HTTP Method</label>
          <select className="nodrag basenode-select" value={method} onChange={handleMethodChange}>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>

        <div>
          <label className="basenode-field-label">URL (supports &#123;&#123;variable&#125;&#125;)</label>
          <input
            className="nodrag basenode-input"
            type="text"
            value={url}
            onChange={handleUrlChange}
            placeholder="https://api.example.com/data/{{id}}"
          />
        </div>

        {(method === 'POST' || method === 'PUT') && (
          <div>
            <label className="basenode-field-label">Request Body (JSON / Text)</label>
            <textarea
              className="nodrag basenode-textarea"
              value={body}
              onChange={handleBodyChange}
              placeholder='{"query": "{{input}}"}'
              rows={2}
            />
          </div>
        )}

        {variables.length > 0 && (
          <div style={{ marginTop: '2px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Vars:</span>
            {variables.map((v) => (
              <span key={v} className="basenode-variable-badge">{v}</span>
            ))}
          </div>
        )}
      </div>
    )
  };

  return <BaseNode id={id} data={data} config={config} />;
};
