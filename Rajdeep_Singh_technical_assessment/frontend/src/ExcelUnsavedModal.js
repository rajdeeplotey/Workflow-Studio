// ExcelUnsavedModal.js - Microsoft Excel-Style "Save / Don't Save / Cancel" Confirmation Modal

import { useState, useEffect } from 'react';
import { useStore } from './store';

export const ExcelUnsavedModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { workflows, activeWorkflowId, nodes, edges, markWorkflowFileSaved } = useStore((state) => ({
    workflows: state.workflows,
    activeWorkflowId: state.activeWorkflowId,
    nodes: state.nodes,
    edges: state.edges,
    markWorkflowFileSaved: state.markWorkflowFileSaved
  }));

  const activeWf = workflows.find((w) => w.id === activeWorkflowId) || workflows[0];
  const activeName = activeWf?.name || 'Untitled 1';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if the user previously closed the tab with unsaved edits
    const pending = localStorage.getItem('vectorshift_unsaved_prompt_pending');
    if (pending === 'true') {
      const hasUnsavedWork = (nodes && nodes.length > 0) || (edges && edges.length > 0);
      if (hasUnsavedWork) {
        setIsOpen(true);
      } else {
        localStorage.removeItem('vectorshift_unsaved_prompt_pending');
      }
    }
  }, []);

  const handleSave = async () => {
    // Open native Laptop Save File Picker dialog to save .json file to PC disk
    try {
      const exportData = {
        id: activeWf?.id || 'wf-1',
        name: activeName,
        nodes: nodes,
        edges: edges,
        exportedAt: new Date().toISOString()
      };

      const jsonStr = JSON.stringify(exportData, null, 2);

      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: `${activeName.replace(/\s+/g, '_')}.json`,
          types: [{
            description: 'JSON Workflow File',
            accept: { 'application/json': ['.json'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(jsonStr);
        await writable.close();
      } else {
        // Fallback for browsers without showSaveFilePicker
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${activeName.replace(/\s+/g, '_')}.json`;
        link.click();
        URL.revokeObjectURL(url);
      }

      markWorkflowFileSaved(activeWorkflowId);
      localStorage.removeItem('vectorshift_unsaved_prompt_pending');
      setIsOpen(false);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error saving file:', err);
      }
    }
  };

  const handleDontSave = () => {
    // Clear unsaved edits and reset active workflow to clean empty sheet
    localStorage.removeItem('vectorshift_unsaved_prompt_pending');
    
    useStore.setState({
      nodes: [],
      edges: [],
      nodeIDs: {},
      past: [],
      future: []
    });

    useStore.getState().syncActiveWorkflow([], []);
    setIsOpen(false);
  };

  const handleCancel = () => {
    localStorage.removeItem('vectorshift_unsaved_prompt_pending');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: 'var(--bg-card)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
        padding: '24px',
        fontFamily: 'var(--font-sans)',
        color: 'var(--text-primary)',
        position: 'relative',
        animation: 'excelPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Floating Top Right Close Button */}
        <button
          type="button"
          onClick={handleCancel}
          style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
          }}
          title="Cancel"
        >
          ✕
        </button>

        {/* Header Icon & Title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
          <div style={{
            fontSize: '22px',
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#F59E0B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            💾
          </div>

          <div>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
              Want to save your changes to "{activeName}"?
            </h2>
            <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
              If you click 'Don't Save', a copy of your recent unsaved workflow edits will be permanently discarded.
            </p>
          </div>
        </div>

        {/* Unsaved Items Summary Card */}
        <div style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '10px 14px',
          marginBottom: '20px',
          fontSize: '11px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>Unsaved Workflow State</span>
          <span style={{ fontWeight: '600', color: '#F59E0B' }}>
            {nodes.length} nodes • {edges.length} connections
          </span>
        </div>

        {/* 3 Standard Microsoft Excel Action Buttons: [Save] [Don't Save] [Cancel] */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={handleCancel}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)'
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDontSave}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#EF4444',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              transition: 'all 0.15s ease'
            }}
          >
            Don't Save
          </button>

          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              fontFamily: 'var(--font-sans)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>💾</span> Save
          </button>
        </div>
      </div>

      <style>{`
        @keyframes excelPopIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
