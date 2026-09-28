// TrashModal.js - Trash Management Modal with Saved Laptop JSON File Tracking & 30-Day Auto Retention

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from './store';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const TrashModal = ({ isOpen, onClose }) => {
  const { trash, restoreWorkflow, permanentlyDeleteWorkflow, emptyTrash } = useStore((state) => ({
    trash: state.trash,
    restoreWorkflow: state.restoreWorkflow,
    permanentlyDeleteWorkflow: state.permanentlyDeleteWorkflow,
    emptyTrash: state.emptyTrash
  }));

  const [isEmptying, setIsEmptying] = useState(false);

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

  const handleEmptyTrash = () => {
    setIsEmptying(true);
    setTimeout(() => {
      emptyTrash();
      setIsEmptying(false);
    }, 250);
  };

  const calculateDaysLeft = (deletedAt) => {
    if (!deletedAt) return 30;
    const elapsedMs = Date.now() - deletedAt;
    const remainingMs = THIRTY_DAYS_MS - elapsedMs;
    const days = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
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
        backgroundColor: 'transparent',
        backdropFilter: 'none',
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
          boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.2)',
          maxWidth: '520px',
          width: '90%',
          padding: '24px',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-sans)',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative'
        }}
      >
        {/* Floating Close Cross Button anchored outside top-right corner */}
        <button
          type="button"
          onClick={onClose}
          title="Close Trash Modal"
          style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: '700',
            cursor: 'pointer',
            zIndex: 25,
            transition: 'all 0.15s ease-in-out'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#EF4444';
            e.currentTarget.style.borderColor = '#EF4444';
            e.currentTarget.style.color = '#FFFFFF';
            e.currentTarget.style.transform = 'scale(1.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-card)';
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ✕
        </button>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px'
            }}>
              🗑️
            </div>
            <div>
              <h2 style={{
                color: 'var(--text-primary)',
                margin: 0,
                fontSize: '16px',
                fontWeight: '600',
                letterSpacing: '-0.2px'
              }}>
                Studio Trash Bin
              </h2>
              <p style={{
                color: 'var(--text-muted)',
                margin: '2px 0 0 0',
                fontSize: '12px'
              }}>
                Closed & Deleted JSON Workflows (30 days retention)
              </p>
            </div>
          </div>

          {trash.length > 0 && (
            <button
              type="button"
              onClick={handleEmptyTrash}
              disabled={isEmptying}
              style={{
                background: 'transparent',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                padding: '5px 10px',
                color: '#EF4444',
                fontSize: '11px',
                fontWeight: '500',
                cursor: isEmptying ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!isEmptying) e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
              }}
              onMouseLeave={(e) => {
                if (!isEmptying) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {isEmptying ? (
                <>
                  <span className="spin-icon" style={{ fontSize: '11px', display: 'inline-block' }}>↻</span>
                  <span>Emptying...</span>
                </>
              ) : (
                <span>Empty Trash</span>
              )}
            </button>
          )}
        </div>

        {/* List of Trashed Workflows */}
        <div style={{
          maxHeight: '320px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          paddingRight: '4px'
        }}>
          {trash.length === 0 ? (
            <div style={{
              padding: '32px 20px',
              textAlign: 'center',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-input)',
              border: '1px dashed var(--border-color)',
              color: 'var(--text-muted)',
              fontSize: '13px'
            }}>
              Trash is empty.
            </div>
          ) : (
            trash.map((item) => {
              const daysLeft = calculateDaysLeft(item.deletedAt);
              const nodeCount = item.nodes ? item.nodes.length : 0;
              const edgeCount = item.edges ? item.edges.length : 0;
              const isSavedFile = item.hasBeenFileSaved;

              return (
                <div
                  key={item.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: 'var(--text-primary)',
                      marginBottom: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span>{item.name}{isSavedFile ? '.json' : ''}</span>
                      {isSavedFile && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '600',
                          color: '#3B82F6',
                          backgroundColor: 'rgba(59, 130, 246, 0.12)',
                          padding: '1px 6px',
                          borderRadius: '4px'
                        }}>
                          Saved Laptop File
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{
                        padding: '1px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(239, 68, 68, 0.12)',
                        color: '#EF4444',
                        fontWeight: '500'
                      }}>
                        {daysLeft === 0 ? 'Expiring today' : `${daysLeft} days remaining`}
                      </span>
                      <span>{nodeCount} nodes • {edgeCount} edges</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {/* Restore Button */}
                    <button
                      type="button"
                      onClick={() => {
                        restoreWorkflow(item.id);
                        onClose();
                      }}
                      title="Restore workflow back to active sheet tabs"
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                        fontWeight: '500',
                        fontFamily: 'var(--font-sans)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                      }}
                    >
                      Restore ↩
                    </button>

                    {/* Delete Permanently Button */}
                    <button
                      type="button"
                      onClick={() => permanentlyDeleteWorkflow(item.id)}
                      title="Delete permanently from studio trash"
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        background: 'transparent',
                        border: 'none',
                        color: '#EF4444',
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
