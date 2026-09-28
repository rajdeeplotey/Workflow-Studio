// SaveButton.js - Authentic Blue Floppy Disk Save Button with Laptop File Handle tracking

import { useState, useEffect, useCallback } from 'react';
import { useStore } from './store';

// Authentic Blue Microsoft Floppy Disk Icon
const SaveIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="2.5" fill="#2563EB" />
    <rect x="7" y="3" width="8" height="6" rx="0.5" fill="#E2E8F0" />
    <rect x="11" y="4" width="2" height="4" rx="0.5" fill="#2563EB" />
    <rect x="6" y="12" width="12" height="9" rx="1" fill="#FFFFFF" />
    <line x1="8" y1="15" x2="16" y2="15" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="8" y1="18" x2="14" y2="18" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const SpinnerIcon = ({ size = 15 }) => (
  <svg className="spin-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
  </svg>
);

const CheckIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const SaveButton = () => {
  const {
    workflows,
    activeWorkflowId,
    nodes,
    edges,
    syncActiveWorkflow,
    markWorkflowFileSaved
  } = useStore((state) => ({
    workflows: state.workflows,
    activeWorkflowId: state.activeWorkflowId,
    nodes: state.nodes,
    edges: state.edges,
    syncActiveWorkflow: state.syncActiveWorkflow,
    markWorkflowFileSaved: state.markWorkflowFileSaved
  }));

  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const activeWf = workflows.find(w => w.id === activeWorkflowId) || { name: 'Untitled 1' };

  // Trigger Native OS File Save Picker for JSON export to laptop folder
  const exportWorkflowToFile = useCallback(async (workflowName) => {
    const name = workflowName || activeWf.name || 'Untitled Workflow';
    const data = {
      id: activeWorkflowId,
      name: name,
      exportedAt: new Date().toISOString(),
      nodes: nodes || [],
      edges: edges || []
    };

    const jsonString = JSON.stringify(data, null, 2);
    const sanitizedFilename = `${name.toLowerCase().replace(/[^a-z0-9]/gi, '_')}.json`;

    if (typeof window !== 'undefined' && window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: sanitizedFilename,
          types: [{
            description: 'JSON Workflow File',
            accept: { 'application/json': ['.json'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(jsonString);
        await writable.close();
        return handle;
      } catch (err) {
        if (err.name === 'AbortError') return null;
        console.warn('showSaveFilePicker error, falling back to download:', err);
      }
    }

    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = sanitizedFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  }, [activeWf.name, activeWorkflowId, edges, nodes]);

  // Main Save Handler
  const handleSaveClick = useCallback(async () => {
    setIsSaving(true);
    setJustSaved(false);

    // 1. Sync and save to studio sheet (localStorage)
    syncActiveWorkflow(nodes, edges);

    // 2. Only trigger native File Picker if workflow has NEVER been saved to laptop disk before!
    const isFirstTimeSave = !activeWf.hasBeenFileSaved;

    if (isFirstTimeSave) {
      const fileSavedResult = await exportWorkflowToFile(activeWf.name);
      if (fileSavedResult) {
        const handle = typeof fileSavedResult === 'object' ? fileSavedResult : null;
        markWorkflowFileSaved(activeWorkflowId, handle);
      }
    }

    // 3. Fast 0.15s loading spinner animation -> Saved
    setTimeout(() => {
      setIsSaving(false);
      setJustSaved(true);
      setTimeout(() => {
        setJustSaved(false);
      }, 1200);
    }, 150);
  }, [activeWf.hasBeenFileSaved, activeWf.name, activeWorkflowId, edges, exportWorkflowToFile, markWorkflowFileSaved, nodes, syncActiveWorkflow]);

  // Keyboard shortcut listener for Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (isCmdOrCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveClick]);

  return (
    <button
      type="button"
      onClick={handleSaveClick}
      disabled={isSaving}
      title="Save Workflow (Ctrl + S)"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '30px',
        height: '30px',
        borderRadius: '8px',
        backgroundColor: justSaved ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-input)',
        border: justSaved ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-color)',
        color: 'var(--text-primary)',
        cursor: isSaving ? 'wait' : 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        flexShrink: 0
      }}
      onMouseEnter={(e) => {
        if (!justSaved && !isSaving) {
          e.currentTarget.style.borderColor = '#2563EB';
          e.currentTarget.style.backgroundColor = 'var(--bg-card)';
        }
      }}
      onMouseLeave={(e) => {
        if (!justSaved && !isSaving) {
          e.currentTarget.style.borderColor = 'var(--border-color)';
          e.currentTarget.style.backgroundColor = 'var(--bg-input)';
        }
      }}
    >
      {isSaving ? (
        <SpinnerIcon size={16} />
      ) : justSaved ? (
        <CheckIcon size={16} />
      ) : (
        <SaveIcon size={17} />
      )}
    </button>
  );
};

// Keyframe animation for spinner
if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('save-spin-style');
  if (!existingStyle) {
    const style = document.createElement('style');
    style.id = 'save-spin-style';
    style.textContent = `
      @keyframes spinAnimation {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .spin-icon {
        animation: spinAnimation 0.8s linear infinite;
        display: inline-block;
      }
    `;
    document.head.appendChild(style);
  }
}
