// ExecutionResultModal.js - Real Execution Engine Output Modal with VS Logo Badge

import { createPortal } from 'react-dom';

export const ExecutionResultModal = ({ isOpen, onClose, result, error }) => {
  if (!isOpen) return null;

  const isCycleError = result && result.success === false && result.error;
  const terminalOutputs = result?.terminal_outputs || {};
  const executionLogs = result?.node_execution_logs || {};
  const topologicalOrder = result?.topological_order || [];

  const modalContent = (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '20px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          maxWidth: '650px',
          width: '92%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-sans)',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header with VS Logo Badge */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-header)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* VS Logo Badge replacing thunderbolt emoji */}
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: error || isCycleError ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-color)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              backgroundColor: 'var(--bg-card)',
              flexShrink: 0
            }}>
              {error || isCycleError ? (
                <span style={{ fontSize: '18px' }}>⚠️</span>
              ) : (
                <>
                  <img
                    src={process.env.PUBLIC_URL + '/logo.jpg'}
                    alt="WS Logo"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) {
                        e.target.nextSibling.style.display = 'flex';
                      }
                    }}
                  />
                  <span style={{ display: 'none', fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    WS
                  </span>
                </>
              )}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
                {error || isCycleError ? 'Execution Failed' : 'Pipeline Execution Results'}
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {error || isCycleError ? 'CYCLE DETECTED / ERROR' : `Executed ${topologicalOrder.length} nodes in topological order`}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Error Banner */}
          {(error || isCycleError) && (
            <div style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#EF4444',
              fontSize: '13px',
              lineHeight: '1.5'
            }}>
              <strong>Error:</strong> {error || result.error}
            </div>
          )}

          {/* Terminal Output Banner */}
          {!error && !isCycleError && result?.success && (
            <div style={{
              padding: '18px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#10B981', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                🎯 Terminal Output(s)
              </div>
              {Object.keys(terminalOutputs).length > 0 ? (
                Object.entries(terminalOutputs).map(([key, val]) => (
                  <div key={key} style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600' }}>
                      {key}:
                    </div>
                    <pre style={{
                      margin: 0,
                      fontSize: '13px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-primary)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}
                    </pre>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Execution finished successfully. Add an <strong>Output Node</strong> to see formatted final results.
                </div>
              )}
            </div>
          )}

          {/* Node Execution Logs Timeline */}
          {!error && !isCycleError && result?.success && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Topological Execution Step Logs
              </h4>

              {topologicalOrder.map((nodeId, index) => {
                const log = executionLogs[nodeId];
                if (!log) return null;

                return (
                  <div
                    key={nodeId}
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          color: '#2563EB',
                          background: 'rgba(37, 99, 235, 0.15)',
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          Step {index + 1}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                          {log.name} ({log.type})
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {log.execution_time_ms} ms
                      </span>
                    </div>

                    {/* Output Value */}
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>
                        Output:
                      </div>
                      <pre style={{
                        margin: 0,
                        fontSize: '12px',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-primary)',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}>
                        {typeof log.output === 'object' ? JSON.stringify(log.output, null, 2) : String(log.output)}
                      </pre>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-color)',
          background: 'var(--bg-header)',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              background: '#2563EB',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
