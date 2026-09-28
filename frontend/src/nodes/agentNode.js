// agentNode.js - Bounded AI Agent Node

import { useState, useEffect, useMemo } from 'react';
import { useUpdateNodeInternals } from 'reactflow';
import { useStore } from '../store';
import { BaseNode } from './BaseNode';
import './BaseNode.css';

const VARIABLE_REGEX = /\{\{\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\}\}/g;

export const AgentNode = ({ id, data }) => {
  const { updateNodeField } = useStore();
  const updateNodeInternals = useUpdateNodeInternals();

  const [goal, setGoal] = useState(data?.goal || '');
  const [maxSteps, setMaxSteps] = useState(data?.max_steps || 3);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    if (data?.goal !== undefined && data.goal !== goal) setGoal(data.goal);
    if (data?.max_steps !== undefined && data.max_steps !== maxSteps) setMaxSteps(data.max_steps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.goal, data?.max_steps]);

  // Extract variables from goal
  const variables = useMemo(() => {
    const matches = new Set();
    let match;
    const regex = new RegExp(VARIABLE_REGEX.source, 'g');
    while ((match = regex.exec(goal)) !== null) {
      matches.add(match[1]);
    }
    return Array.from(matches);
  }, [goal]);

  useEffect(() => {
    updateNodeInternals(id);

    const validHandleIds = new Set([
      `${id}-goal`,
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
  }, [goal, id, variables, updateNodeInternals]);

  const handleGoalChange = (e) => {
    const val = e.target.value;
    setGoal(val);
    updateNodeField(id, 'goal', val);
  };

  const handleMaxStepsChange = (e) => {
    const val = Math.min(Math.max(parseInt(e.target.value, 10) || 1, 1), 5);
    setMaxSteps(val);
    updateNodeField(id, 'max_steps', val);
  };

  const handles = [
    {
      id: `${id}-goal`,
      type: 'target',
      position: 'left',
      label: 'goal'
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

  const agentSteps = data?.output?.steps || [];

  const config = {
    title: 'AI Agent',
    icon: '🧠',
    accent: '#8B5CF6',
    width: 270,
    minHeight: 200,
    handles: handles,
    children: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div>
          <label className="basenode-field-label">Agent Goal / Instruction (supports &#123;&#123;variable&#125;&#125;)</label>
          <textarea
            className="nodrag basenode-textarea"
            value={goal}
            onChange={handleGoalChange}
            placeholder="e.g. Fetch user data and search RAG context to formulate response"
            rows={3}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className="basenode-field-label">Max Tool Calls (Bounded Cap)</label>
          <input
            className="nodrag basenode-number"
            type="number"
            min={1}
            max={5}
            value={maxSteps}
            onChange={handleMaxStepsChange}
            style={{ width: '60px' }}
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

        {/* Transparent Agent Execution Logs Viewer */}
        {agentSteps.length > 0 && (
          <div style={{ marginTop: '4px' }}>
            <button
              type="button"
              onClick={() => setShowLogs(!showLogs)}
              className="nodrag"
              style={{
                fontSize: '10px',
                fontWeight: '600',
                color: '#8B5CF6',
                background: 'rgba(139, 92, 246, 0.12)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '4px',
                padding: '3px 8px',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              {showLogs ? '▼ Hide Step Logs' : `▶ View Step Logs (${agentSteps.length} steps)`}
            </button>

            {showLogs && (
              <div style={{
                marginTop: '6px',
                padding: '6px',
                background: 'var(--bg-input)',
                borderRadius: '6px',
                fontSize: '10px',
                maxHeight: '120px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                {agentSteps.map((s, idx) => (
                  <div key={idx} style={{ padding: '4px', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ color: '#8B5CF6', fontWeight: '700' }}>Step {s.step}: {s.action}</div>
                    {s.result && <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{String(s.result).slice(0, 100)}...</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  };

  return <BaseNode id={id} data={data} config={config} />;
};
