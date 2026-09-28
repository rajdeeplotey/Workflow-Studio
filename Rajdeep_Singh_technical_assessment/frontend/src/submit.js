// submit.js - Dual Pipeline Action Controls: Analyze (Part 4) vs Run Execution Engine (Bonus)

import { useState } from 'react';
import { useStore } from './store';
import { ResultModal } from './ResultModal';
import { ExecutionResultModal } from './ExecutionResultModal';

export const SubmitButton = () => {
  // Parse Modal state
  const [parseModalOpen, setParseModalOpen] = useState(false);
  const [parseLoading, setParseLoading] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [parseError, setParseError] = useState(null);

  // Execution Modal state
  const [execModalOpen, setExecModalOpen] = useState(false);
  const [execLoading, setExecLoading] = useState(false);
  const [execResult, setExecResult] = useState(null);
  const [execError, setExecError] = useState(null);

  const { nodes, edges } = useStore((state) => ({
    nodes: state.nodes,
    edges: state.edges
  }));

  // Analyze Pipeline (/pipelines/parse)
  const handleParseSubmit = async () => {
    setParseLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/pipelines/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({ nodes, edges }),
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setParseResult(data);
      setParseError(null);
      setParseModalOpen(true);
    } catch (err) {
      setParseError(err.message.includes('Failed to fetch')
        ? "Couldn't reach the backend — is it running on port 8000?"
        : err.message);
      setParseResult(null);
      setParseModalOpen(true);
      console.error('Parse error:', err);
    } finally {
      setParseLoading(false);
    }
  };

  // Run Execution Engine (/pipelines/execute)
  const handleExecuteSubmit = async () => {
    setExecLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/pipelines/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({ nodes, edges }),
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setExecResult(data);
      setExecError(null);
      setExecModalOpen(true);
    } catch (err) {
      setExecError(err.message.includes('Failed to fetch')
        ? "Couldn't reach the backend — is it running on port 8000?"
        : err.message);
      setExecResult(null);
      setExecModalOpen(true);
      console.error('Execute error:', err);
    } finally {
      setExecLoading(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Required Part 4: Analyze Pipeline Button */}
        <button
          type="button"
          onClick={handleParseSubmit}
          disabled={parseLoading || execLoading}
          title="Analyze pipeline graph structure (node count, edge count, DAG validation)"
          style={{
            padding: '10px 20px',
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--text-primary)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            cursor: parseLoading ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: "var(--font-sans)",
            letterSpacing: '0.2px',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            opacity: parseLoading ? 0.7 : 1
          }}
          onMouseOver={(e) => {
            if (!parseLoading) {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseOut={(e) => {
            if (!parseLoading) {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          <span>{parseLoading ? '⏳' : '📊'}</span>
          {parseLoading ? 'Analyzing...' : 'Analyze Pipeline'}
        </button>

        {/* Bonus Feature: Run Execution Engine Button */}
        <button
          type="button"
          onClick={handleExecuteSubmit}
          disabled={parseLoading || execLoading}
          title="Execute the graph data flow node-by-node and generate real/mock LLM output"
          style={{
            padding: '10px 24px',
            fontSize: '13px',
            fontWeight: '600',
            color: '#ffffff',
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            border: 'none',
            borderRadius: '10px',
            cursor: execLoading ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: "var(--font-sans)",
            letterSpacing: '0.2px',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            opacity: execLoading ? 0.7 : 1
          }}
          onMouseOver={(e) => {
            if (!execLoading) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 18px rgba(16, 185, 129, 0.4)';
            }
          }}
          onMouseOut={(e) => {
            if (!execLoading) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.3)';
            }
          }}
        >
          <span>{execLoading ? '⏳' : '▶'}</span>
          {execLoading ? 'Executing Engine...' : 'Run Execution Engine'}
        </button>
      </div>

      {/* Parse Modal */}
      <ResultModal
        isOpen={parseModalOpen}
        onClose={() => setParseModalOpen(false)}
        result={parseResult}
        error={parseError}
      />

      {/* Real Execution Modal */}
      <ExecutionResultModal
        isOpen={execModalOpen}
        onClose={() => setExecModalOpen(false)}
        result={execResult}
        error={execError}
      />
    </>
  );
};
