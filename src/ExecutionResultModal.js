// ExecutionResultModal.js - Real Execution Engine Output Modal with VS Logo Badge

import { createPortal } from 'react-dom';

export const ExecutionResultModal = ({ isOpen, onClose, result, error }) => {
  if (!isOpen) return null;

  const rawExecutionLogs = result?.node_execution_logs;
  const executionLogs = rawExecutionLogs && typeof rawExecutionLogs === 'object'
    ? rawExecutionLogs
    : {};
  const topologicalOrder = Array.isArray(result?.topological_order)
    ? result.topological_order
    : Object.keys(executionLogs);
  const orderedNodeIds = [
    ...topologicalOrder,
    ...Object.keys(executionLogs).filter((nodeId) => !topologicalOrder.includes(nodeId))
  ];
  const nodeEntries = orderedNodeIds.map((nodeId) => [nodeId, executionLogs[nodeId] || null]);
  const hasNodeDetails = nodeEntries.some(([, log]) => log !== null);
  const terminalOutputs = result?.terminal_outputs && typeof result.terminal_outputs === 'object'
    ? result.terminal_outputs
    : {};
  const normalizeStatus = (status) => String(status || 'unknown').toLowerCase();
  const successfulCount = nodeEntries.filter(([, log]) => normalizeStatus(log?.status) === 'success').length;
  const skippedCount = nodeEntries.filter(([, log]) => normalizeStatus(log?.status) === 'skipped').length;
  const failedCount = nodeEntries.filter(([, log]) => ['error', 'failed'].includes(normalizeStatus(log?.status))).length;
  const durations = nodeEntries
    .map(([, log]) => log?.execution_time_ms)
    .filter((duration) => typeof duration === 'number' && Number.isFinite(duration));
  const isCycleError = result && result.success === false && result.error && !hasNodeDetails;
  const shouldShowError = error || (result?.error && !hasNodeDetails);

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
              {shouldShowError || isCycleError ? (
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
                {shouldShowError || isCycleError ? 'Execution Failed' : 'Pipeline Execution Results'}
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {shouldShowError || isCycleError ? 'CYCLE DETECTED / ERROR' : `Executed ${orderedNodeIds.length} nodes in topological order`}
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
          {(shouldShowError || isCycleError) && (
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

          {hasNodeDetails ? (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))',
                gap: '8px',
                padding: '12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px'
              }}>
                <div><strong>Status</strong><div>{failedCount > 0 || result?.success === false ? 'FAILED' : result?.success === true ? 'SUCCESS' : 'UNKNOWN'}</div></div>
                {durations.length === nodeEntries.length && durations.length > 0 && (
                  <div><strong>Duration</strong><div>{durations.reduce((total, duration) => total + duration, 0)} ms</div></div>
                )}
                <div><strong>Executed</strong><div>{successfulCount}</div></div>
                <div><strong>Skipped</strong><div>{skippedCount}</div></div>
                <div><strong>Failed</strong><div>{failedCount}</div></div>
              </div>

              {/* Terminal Output Banner */}
              {Object.keys(terminalOutputs).length > 0 && (
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
                  {Object.entries(terminalOutputs).map(([key, val]) => (
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
                  ))}
                </div>
              )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Execution Details
              </h4>

              {nodeEntries.map(([nodeId, log], index) => {
                const status = normalizeStatus(log?.status);
                const statusLabel = status === 'success' ? 'SUCCESS'
                  : status === 'skipped' ? 'SKIPPED'
                    : ['error', 'failed'].includes(status) ? 'FAILED'
                      : status.toUpperCase();
                const output = log?.output;
                const inputs = log?.inputs_received;
                const formatValue = (value) => value === undefined || value === null
                  ? 'No output'
                  : typeof value === 'string' ? value : JSON.stringify(value, null, 2);
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
                          color: status === 'success' ? '#059669' : status === 'skipped' ? '#6B7280' : statusLabel === 'FAILED' ? '#DC2626' : '#2563EB',
                          background: status === 'success' ? 'rgba(5, 150, 105, 0.12)' : status === 'skipped' ? 'rgba(107, 114, 128, 0.12)' : statusLabel === 'FAILED' ? 'rgba(220, 38, 38, 0.12)' : 'rgba(37, 99, 235, 0.15)',
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          {status === 'success' ? '✓' : status === 'skipped' ? '⊘' : statusLabel === 'FAILED' ? '✕' : `Step ${index + 1}`} {statusLabel}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                          {log?.name || nodeId}{log?.type ? ` (${log.type})` : ''}
                        </span>
                      </div>
                      {typeof log?.execution_time_ms === 'number' && Number.isFinite(log.execution_time_ms) && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {log.execution_time_ms} ms
                        </span>
                      )}
                    </div>

                    {log?.error && <div style={{ color: '#DC2626', fontSize: '12px' }}><strong>Error:</strong> {log.error}</div>}
                    {status === 'skipped' && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                        Reason: {log?.skip_reason || log?.reason || 'Skipped by workflow routing.'}
                      </div>
                    )}
                    {log?.output?.passed !== undefined && (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Result: {log.output.passed ? 'TRUE' : 'FALSE'}
                      </div>
                    )}
                    {inputs !== undefined && (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Input:</div>
                        <pre style={{ margin: 0, fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{formatValue(inputs)}</pre>
                      </div>
                    )}
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Output:</div>
                      <pre style={{ margin: 0, fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{formatValue(output)}</pre>
                    </div>
                  </div>
                );
              })}
            </div>
            </>
          ) : !shouldShowError && (
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No execution details returned.</div>
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
