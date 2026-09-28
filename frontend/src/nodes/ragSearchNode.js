// ragSearchNode.js - RAG Vector Search Node

import { useState, useEffect, useMemo } from 'react';
import { useUpdateNodeInternals } from 'reactflow';
import { useStore } from '../store';
import { BaseNode } from './BaseNode';
import './BaseNode.css';

const VARIABLE_REGEX = /\{\{\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\}\}/g;

export const RAGSearchNode = ({ id, data }) => {
  const { updateNodeField } = useStore();
  const updateNodeInternals = useUpdateNodeInternals();

  const [query, setQuery] = useState(data?.query || '');
  const [topK, setTopK] = useState(data?.top_k || 3);

  useEffect(() => {
    if (data?.query !== undefined && data.query !== query) setQuery(data.query);
    if (data?.top_k !== undefined && data.top_k !== topK) setTopK(data.top_k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.query, data?.top_k]);

  // Extract variables from query
  const variables = useMemo(() => {
    const matches = new Set();
    let match;
    const regex = new RegExp(VARIABLE_REGEX.source, 'g');
    while ((match = regex.exec(query)) !== null) {
      matches.add(match[1]);
    }
    return Array.from(matches);
  }, [query]);

  useEffect(() => {
    updateNodeInternals(id);

    const validHandleIds = new Set([
      `${id}-query`,
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
  }, [query, id, variables, updateNodeInternals]);

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    updateNodeField(id, 'query', val);
  };

  const handleTopKChange = (e) => {
    const val = parseInt(e.target.value, 10) || 3;
    setTopK(val);
    updateNodeField(id, 'top_k', val);
  };

  const handles = [
    {
      id: `${id}-query`,
      type: 'target',
      position: 'left',
      label: 'query'
    },
    ...variables.map((v) => ({
      id: `var-${v}`,
      type: 'target',
      position: 'left',
      label: v
    })),
    {
      id: `${id}-context`,
      type: 'source',
      position: 'right',
      label: 'context'
    }
  ];

  const config = {
    title: 'RAG Search',
    icon: '🔍',
    accent: '#14B8A6',
    width: 250,
    minHeight: 160,
    handles: handles,
    children: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div>
          <label className="basenode-field-label">Search Query (supports &#123;&#123;variable&#125;&#125;)</label>
          <input
            className="nodrag basenode-input"
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="e.g. {{user_question}}"
          />
        </div>

        <div>
          <label className="basenode-field-label">Top-K Results</label>
          <input
            className="nodrag basenode-number"
            type="number"
            min={1}
            max={10}
            value={topK}
            onChange={handleTopKChange}
          />
        </div>

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
