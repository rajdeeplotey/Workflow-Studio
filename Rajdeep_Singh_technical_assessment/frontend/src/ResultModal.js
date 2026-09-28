// ResultModal.js - Theme-Adaptive Pipeline Analysis Modal

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from './store';

export const ResultModal = ({ isOpen, onClose, result, error }) => {
  const { appearance } = useStore((state) => ({
    appearance: state.appearance
  }));

  // Listen for Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Theme-specific styling overrides
  const isDefaultTheme = appearance === 'default';
  const isLightTheme = appearance === 'light';

  const backdropBg = isDefaultTheme 
    ? 'rgba(15, 19, 26, 0.45)' 
    : isLightTheme 
    ? 'rgba(15, 23, 42, 0.45)' 
    : 'rgba(5, 7, 12, 0.75)';

  const buttonStyle = isDefaultTheme
    ? {
        background: '#5B4824',
        color: '#FFFFFF',
        boxShadow: '0 4px 14px rgba(91, 72, 36, 0.3)'
      }
    : {
        background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
        color: '#FFFFFF',
        boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
      };

  const modalContent = (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: backdropBg,
        backdropFilter: 'blur(10px)',
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
          backdropFilter: 'blur(24px)',
          borderRadius: '20px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 30px 70px -15px rgba(0, 0, 0, 0.25)',
          maxWidth: '460px',
          width: '90%',
          padding: '28px',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-sans)',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative'
        }}
      >
        {error ? (
          /* Error State */
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                color: '#FB7185'
              }}>
                ⚠️
              </div>
              <div>
                <h2 style={{
                  color: '#FB7185',
                  margin: 0,
                  fontSize: '17px',
                  fontWeight: '600',
                  letterSpacing: '-0.2px'
                }}>
                  Analysis Failed
                </h2>
                <p style={{
                  color: 'var(--text-muted)',
                  margin: '3px 0 0 0',
                  fontSize: '12px'
                }}>
                  Unable to complete pipeline validation
                </p>
              </div>
            </div>

            <div style={{
              backgroundColor: 'rgba(244, 63, 94, 0.06)',
              border: '1px solid rgba(244, 63, 94, 0.2)',
              borderRadius: '12px',
              padding: '14px',
              marginBottom: '24px'
            }}>
              <p style={{
                color: '#FB7185',
                margin: 0,
                fontSize: '12px',
                lineHeight: '1.5',
                fontFamily: 'var(--font-mono)'
              }}>
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '10px',
                background: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: '#FB7185',
                fontSize: '13px',
                fontWeight: '600',
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(244, 63, 94, 0.2)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(244, 63, 94, 0.12)';
              }}
            >
              Close
            </button>
          </div>
        ) : (
          /* Success State */
          <div>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              marginBottom: '22px'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                color: '#10B981',
                fontWeight: 'bold',
                boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)'
              }}>
                ✓
              </div>
              <div>
                <h2 style={{
                  color: 'var(--text-primary)',
                  margin: 0,
                  fontSize: '17px',
                  fontWeight: '600',
                  letterSpacing: '-0.2px'
                }}>
                  Pipeline Analyzed
                </h2>
                <p style={{
                  color: 'var(--text-muted)',
                  margin: '3px 0 0 0',
                  fontSize: '12px'
                }}>
                  Graph topology validation complete
                </p>
              </div>
            </div>

            {/* Metrics Grid (Nodes & Edges) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '16px'
            }}>
              {/* Total Nodes */}
              <div style={{
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '16px 18px',
                transition: 'transform 0.2s ease, border-color 0.2s ease'
              }}>
                <div style={{
                  fontSize: '10px',
                  fontWeight: '500',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: '6px'
                }}>
                  Total Nodes
                </div>
                <div style={{
                  fontSize: '28px',
                  fontWeight: '600',
                  color: isDefaultTheme ? '#5B4824' : '#818CF8',
                  lineHeight: '1.2'
                }}>
                  {result.num_nodes}
                </div>
              </div>

              {/* Total Edges */}
              <div style={{
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '16px 18px',
                transition: 'transform 0.2s ease, border-color 0.2s ease'
              }}>
                <div style={{
                  fontSize: '10px',
                  fontWeight: '500',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: '6px'
                }}>
                  Total Edges
                </div>
                <div style={{
                  fontSize: '28px',
                  fontWeight: '600',
                  color: isDefaultTheme ? '#C5A562' : '#38BDF8',
                  lineHeight: '1.2'
                }}>
                  {result.num_edges}
                </div>
              </div>
            </div>

            {/* Topology Status Card (Is DAG) */}
            <div style={{
              backgroundColor: result.is_dag 
                ? 'rgba(16, 185, 129, 0.08)' 
                : 'rgba(244, 63, 94, 0.08)',
              border: result.is_dag 
                ? '1px solid rgba(16, 185, 129, 0.25)' 
                : '1px solid rgba(244, 63, 94, 0.25)',
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: result.is_dag ? '#10B981' : '#FB7185',
                  boxShadow: result.is_dag 
                    ? '0 0 10px #10B981' 
                    : '0 0 10px #FB7185'
                }} />
                <div>
                  <div style={{
                    fontSize: '10px',
                    fontWeight: '500',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    marginBottom: '2px'
                  }}>
                    Graph Topology
                  </div>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: result.is_dag ? '#10B981' : '#FB7185'
                  }}>
                    IS DAG: {result.is_dag ? 'YES' : 'NO'}
                  </div>
                </div>
              </div>
              
              <span style={{
                fontSize: '11px',
                fontWeight: '500',
                padding: '3px 9px',
                borderRadius: '20px',
                background: result.is_dag ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                color: result.is_dag ? '#10B981' : '#FB7185'
              }}>
                {result.is_dag ? 'Valid DAG' : 'Cyclic Loop'}
              </span>
            </div>

            {/* Action Dismiss Button */}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                fontSize: '13px',
                fontWeight: '600',
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                ...buttonStyle
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
