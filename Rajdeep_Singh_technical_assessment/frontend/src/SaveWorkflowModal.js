// SaveWorkflowModal.js - Save & Export to PC Folder Modal

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export const SaveWorkflowModal = ({ isOpen, onClose, onSaveLocal, onExportFile, defaultName }) => {
  const [name, setName] = useState(defaultName || '');
  const [saveMode, setSaveMode] = useState('both'); // 'local' | 'file' | 'both'

  useEffect(() => {
    setName(defaultName || '');
  }, [defaultName, isOpen]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalName = name.trim() || 'Untitled Workflow';

    if (saveMode === 'local' || saveMode === 'both') {
      onSaveLocal(finalName);
    }

    if (saveMode === 'file' || saveMode === 'both') {
      await onExportFile(finalName);
    }

    onClose();
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
        backgroundColor: 'rgba(5, 7, 12, 0.65)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--bg-card)',
          backdropFilter: 'blur(24px)',
          borderRadius: '20px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 30px 70px -15px rgba(0, 0, 0, 0.35)',
          maxWidth: '440px',
          width: '90%',
          padding: '26px',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-sans)',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
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
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px'
          }}>
            💾
          </div>
          <div>
            <h2 style={{
              color: 'var(--text-primary)',
              margin: 0,
              fontSize: '17px',
              fontWeight: '600',
              letterSpacing: '-0.2px'
            }}>
              Save & Export Workflow
            </h2>
            <p style={{
              color: 'var(--text-muted)',
              margin: '3px 0 0 0',
              fontSize: '12px'
            }}>
              Choose how and where to save your workflow
            </p>
          </div>
        </div>

        {/* Workflow Name Input */}
        <div style={{ marginBottom: '18px' }}>
          <label style={{
            display: 'block',
            fontSize: '11px',
            fontWeight: '600',
            color: 'var(--text-muted)',
            marginBottom: '6px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase'
          }}>
            Workflow Name
          </label>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My AI Pipeline"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontFamily: 'var(--font-sans)',
              boxSizing: 'border-box',
              outline: 'none'
            }}
          />
        </div>

        {/* Destination Option Radio Cards */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '11px',
            fontWeight: '600',
            color: 'var(--text-muted)',
            marginBottom: '8px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase'
          }}>
            Save Location / Destination
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Option 1: App Sheets & Local File */}
            <div
              onClick={() => setSaveMode('both')}
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                border: saveMode === 'both' ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                backgroundColor: saveMode === 'both' ? 'var(--bg-input-focus)' : 'var(--bg-input)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '16px' }}>📁</span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    Save in App + Export to Folder (.json)
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Saves in studio sheets & opens file picker for PC folder
                  </div>
                </div>
              </div>
              <input type="radio" checked={saveMode === 'both'} readOnly />
            </div>

            {/* Option 2: App Sheets Only */}
            <div
              onClick={() => setSaveMode('local')}
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                border: saveMode === 'local' ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                backgroundColor: saveMode === 'local' ? 'var(--bg-input-focus)' : 'var(--bg-input)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '16px' }}>📊</span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    Studio Sheets Only
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Saves inside bottom Excel sheet tabs in browser
                  </div>
                </div>
              </div>
              <input type="radio" checked={saveMode === 'local'} readOnly />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '10px'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: '500',
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              padding: '9px 20px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: '600',
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
              transition: 'all 0.15s ease'
            }}
          >
            Save Workflow
          </button>
        </div>
      </form>
    </div>
  );

  return createPortal(modalContent, document.body);
};
