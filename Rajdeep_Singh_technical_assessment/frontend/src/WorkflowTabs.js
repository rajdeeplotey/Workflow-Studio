// WorkflowTabs.js - Excel-Style Multi-Workflow Sheet Tab Bar with Save / Don't Save Modal on Unsaved Tab Close

import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from './store';

const UnsavedCloseTabModal = ({ isOpen, onClose, onSave, onDontSave, workflowName }) => {
  if (!isOpen) return null;

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
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.2)',
          maxWidth: '420px',
          width: '90%',
          padding: '24px',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-sans)',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(234, 179, 8, 0.12)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px'
          }}>
            ⚠️
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
              Save changes before closing?
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              "{workflowName}" has unsaved changes
            </span>
          </div>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 20px 0', lineHeight: '1.5' }}>
          If you click "Don't Save", your unsaved changes will be discarded.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={onDontSave}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              transition: 'all 0.15s ease'
            }}
          >
            Don't Save
          </button>

          <button
            type="button"
            onClick={onSave}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              background: '#2563EB',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              transition: 'all 0.15s ease'
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export const WorkflowTabs = () => {
  const {
    workflows,
    activeWorkflowId,
    createWorkflow,
    switchWorkflow,
    closeTab,
    renameWorkflow,
    importWorkflow,
    markWorkflowFileSaved
  } = useStore((state) => ({
    workflows: state.workflows,
    activeWorkflowId: state.activeWorkflowId,
    createWorkflow: state.createWorkflow,
    switchWorkflow: state.switchWorkflow,
    closeTab: state.closeTab,
    renameWorkflow: state.renameWorkflow,
    importWorkflow: state.importWorkflow,
    markWorkflowFileSaved: state.markWorkflowFileSaved
  }));

  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [unsavedTarget, setUnsavedTarget] = useState(null); // workflow object for unsaved close modal
  const fileInputRef = useRef(null);

  const handleDoubleClick = (wf) => {
    setEditingId(wf.id);
    setEditingName(wf.name);
  };

  const handleRenameSubmit = (id) => {
    if (editingName.trim()) {
      renameWorkflow(id, editingName.trim());
    }
    setEditingId(null);
  };

  // Trigger Native Laptop File Save Picker Dialog
  const exportWorkflowToFile = useCallback(async (wf) => {
    const name = wf.name || 'Untitled Workflow';
    const data = {
      id: wf.id,
      name: name,
      exportedAt: new Date().toISOString(),
      nodes: wf.nodes || [],
      edges: wf.edges || []
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
  }, []);

  // Cross Button Click Handler: Saved -> Closes tab cleanly with no popups; Unsaved -> Shows Save / Don't Save modal
  const handleCrossClick = (wf, e) => {
    e.stopPropagation();

    if (wf.hasBeenFileSaved) {
      // 1. SAVED WORKFLOW: Close tab cleanly with zero popups and zero trash
      closeTab(wf.id);
    } else {
      // 2. UNSAVED WORKFLOW: Prompt Save / Don't Save modal
      setUnsavedTarget(wf);
    }
  };

  // Handle Save in Modal -> Opens File Picker -> Saves to laptop -> Closes tab
  const handleModalSave = async () => {
    if (!unsavedTarget) return;
    const targetWf = unsavedTarget;
    setUnsavedTarget(null);

    const fileSavedResult = await exportWorkflowToFile(targetWf);
    if (fileSavedResult) {
      const handle = typeof fileSavedResult === 'object' ? fileSavedResult : null;
      markWorkflowFileSaved(targetWf.id, handle);
      closeTab(targetWf.id);
    }
  };

  // Handle Don't Save in Modal -> Closes tab directly
  const handleModalDontSave = () => {
    if (!unsavedTarget) return;
    const targetId = unsavedTarget.id;
    setUnsavedTarget(null);
    closeTab(targetId);
  };

  // Open & parse JSON workflow file from laptop
  const handleFileOpen = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed && (Array.isArray(parsed.nodes) || Array.isArray(parsed.edges))) {
          const defaultName = file.name.replace(/\.json$/i, '');
          importWorkflow({
            name: parsed.name || defaultName,
            nodes: parsed.nodes || [],
            edges: parsed.edges || [],
            nodeIDs: parsed.nodeIDs || {}
          });
        } else {
          alert('Invalid workflow file format. Please select a valid JSON workflow export.');
        }
      } catch (err) {
        console.error('Error parsing JSON workflow file:', err);
        alert('Could not parse JSON file. Please ensure it is a valid JSON workflow file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      maxWidth: 'calc(100vw - 320px)',
      overflowX: 'auto',
      padding: '2px 0'
    }}>
      {/* Unsaved Tab Close Modal Prompt (Save vs Don't Save) */}
      <UnsavedCloseTabModal
        isOpen={!!unsavedTarget}
        onClose={() => setUnsavedTarget(null)}
        onSave={handleModalSave}
        onDontSave={handleModalDontSave}
        workflowName={unsavedTarget?.name || ''}
      />

      {/* Hidden File Input for Opening Existing JSON Files */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleFileOpen}
      />

      {/* List of Workflow Sheet Tabs */}
      {workflows.map((wf) => {
        const isActive = wf.id === activeWorkflowId;
        const isEditing = editingId === wf.id;

        return (
          <div
            key={wf.id}
            onClick={() => switchWorkflow(wf.id)}
            onDoubleClick={() => handleDoubleClick(wf)}
            title="Click to switch • Double-click to rename"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: isActive ? 'var(--bg-card)' : 'transparent',
              border: isActive ? '1px solid var(--border-color)' : '1px solid transparent',
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: isActive ? '600' : '400',
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'all 0.15s ease',
              boxShadow: isActive ? '0 2px 8px rgba(0, 0, 0, 0.08)' : 'none',
              whiteSpace: 'nowrap'
            }}
          >
            {/* Sheet Icon / Dot */}
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: isActive ? 'var(--accent)' : 'var(--text-muted)',
              opacity: isActive ? 1 : 0.4
            }} />

            {/* Editable or Static Name */}
            {isEditing ? (
              <input
                type="text"
                autoFocus
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => handleRenameSubmit(wf.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit(wf.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  border: '1px solid var(--accent)',
                  borderRadius: '4px',
                  padding: '1px 4px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-sans)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  width: '90px'
                }}
              />
            ) : (
              <span>{wf.name}</span>
            )}

            {/* Close Tab Cross Button */}
            <button
              type="button"
              onClick={(e) => handleCrossClick(wf, e)}
              title={wf.hasBeenFileSaved ? "Close tab" : "Close tab (Unsaved changes)"}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '10px',
                cursor: 'pointer',
                padding: '2px 4px',
                borderRadius: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isActive ? 0.8 : 0.4,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#EF4444';
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.opacity = isActive ? 0.8 : 0.4;
              }}
            >
              ✕
            </button>
          </div>
        );
      })}

      {/* Add New Workflow Button (+ Icon Only) */}
      <button
        type="button"
        onClick={createWorkflow}
        title="Create new workflow"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '26px',
          height: '26px',
          borderRadius: '6px',
          background: 'transparent',
          border: '1px solid var(--border-color)',
          color: 'var(--text-muted)',
          fontSize: '14px',
          fontWeight: '600',
          fontFamily: 'var(--font-sans)',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          flexShrink: 0
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--text-primary)';
          e.currentTarget.style.borderColor = 'var(--accent)';
          e.currentTarget.style.backgroundColor = 'var(--bg-card)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-muted)';
          e.currentTarget.style.borderColor = 'var(--border-color)';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        +
      </button>

      {/* Open Existing Workflow JSON File Button */}
      <button
        type="button"
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        title="Open / Import existing workflow JSON file from laptop"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '26px',
          height: '26px',
          borderRadius: '6px',
          background: 'transparent',
          border: '1px solid var(--border-color)',
          color: 'var(--text-muted)',
          fontSize: '13px',
          fontFamily: 'var(--font-sans)',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          flexShrink: 0
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--text-primary)';
          e.currentTarget.style.borderColor = 'var(--accent)';
          e.currentTarget.style.backgroundColor = 'var(--bg-card)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-muted)';
          e.currentTarget.style.borderColor = 'var(--border-color)';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        📂
      </button>
    </div>
  );
};
