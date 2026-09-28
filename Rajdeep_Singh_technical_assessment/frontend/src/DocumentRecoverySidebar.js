// DocumentRecoverySidebar.js - Interactive Document Recovery Sidebar with Live Canvas Background Preview

import { useState, useEffect } from 'react';
import { useStore } from './store';

export const DocumentRecoverySidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [backupData, setBackupData] = useState(null);
  const [previewWfId, setPreviewWfId] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if an auto-backup snapshot exists from a previous session (unexpected cutoff / unsaved work)
    const rawBackup = localStorage.getItem('vectorshift_auto_backup');
    const hasHandled = sessionStorage.getItem('vectorshift_recovery_choice_made');

    if (rawBackup && !hasHandled) {
      try {
        const parsed = JSON.parse(rawBackup);
        if (parsed && Array.isArray(parsed.workflows) && parsed.workflows.length > 0) {
          const hasContent = parsed.workflows.some(
            (w) => (w.nodes && w.nodes.length > 0) || (w.edges && w.edges.length > 0)
          );

          if (hasContent) {
            setBackupData(parsed);
            setIsOpen(true);

            // REQUIREMENT: Background canvas MUST be empty when recovery sidebar occurs, until user clicks a workflow!
            useStore.setState({
              nodes: [],
              edges: []
            });
          }
        }
      } catch (e) {
        console.error('Error parsing auto backup data:', e);
      }
    }
  }, []);

  // When user clicks a workflow item in the sidebar list, update background canvas with its nodes & edges
  const handleSelectPreview = (wf) => {
    setPreviewWfId(wf.id);
    useStore.setState({
      nodes: wf.nodes || [],
      edges: wf.edges || []
    });
  };

  const handleRestore = () => {
    if (backupData && backupData.workflows) {
      // Load restored workflows into Zustand store
      const workflows = backupData.workflows;
      const activeId = previewWfId || backupData.activeId || workflows[0]?.id || null;
      const activeWf = workflows.find((w) => w.id === activeId) || workflows[0];

      useStore.setState({
        workflows: workflows,
        activeWorkflowId: activeWf?.id || null,
        nodes: activeWf?.nodes || [],
        edges: activeWf?.edges || [],
        nodeIDs: activeWf?.nodeIDs || {},
        past: [],
        future: []
      });

      localStorage.setItem('vectorshift_workflows', JSON.stringify(workflows));
      if (activeWf?.id) {
        localStorage.setItem('vectorshift_active_workflow_id', activeWf.id);
      }
    }

    sessionStorage.setItem('vectorshift_recovery_choice_made', 'restored');
    setIsOpen(false);
  };

  const handleDiscard = () => {
    // Clear auto backup snapshot and start fresh with single blank Untitled 1
    localStorage.removeItem('vectorshift_auto_backup');
    localStorage.removeItem('vectorshift_workflows');
    localStorage.removeItem('vectorshift_active_workflow_id');

    const freshWf = [{ id: 'wf-1', name: 'Untitled 1', nodes: [], edges: [], nodeIDs: {}, hasBeenFileSaved: false }];

    useStore.setState({
      workflows: freshWf,
      activeWorkflowId: 'wf-1',
      nodes: [],
      edges: [],
      nodeIDs: {},
      past: [],
      future: []
    });

    localStorage.setItem('vectorshift_workflows', JSON.stringify(freshWf));
    localStorage.setItem('vectorshift_active_workflow_id', 'wf-1');

    sessionStorage.setItem('vectorshift_recovery_choice_made', 'discarded');
    setIsOpen(false);
  };

  const handleClose = () => {
    sessionStorage.setItem('vectorshift_recovery_choice_made', 'dismissed');
    setIsOpen(false);
  };

  if (!isOpen || !backupData) return null;

  const timeFormatted = backupData.timestamp
    ? new Date(backupData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Recent Session';

  return (
    <div style={{
      position: 'fixed',
      top: '57px',
      left: 0,
      bottom: '44px',
      width: '320px',
      backgroundColor: 'var(--bg-card)',
      backdropFilter: 'blur(20px)',
      borderRight: '1px solid var(--border-color)',
      boxShadow: '10px 0 30px rgba(0, 0, 0, 0.15)',
      zIndex: 90,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-sans)',
      color: 'var(--text-primary)',
      animation: 'slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      {/* Sidebar Header with VS Logo Badge */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-header)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* VS Logo Badge in Top Left of Sidebar */}
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border-color)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            backgroundColor: 'var(--bg-card)',
            flexShrink: 0
          }}>
            <img
              src={process.env.PUBLIC_URL + '/logo.jpg'}
              alt="VS Logo"
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
            <span style={{ display: 'none', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
              VS
            </span>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
              Document Recovery
            </h3>
            <span style={{ fontSize: '10px', color: '#10B981', fontWeight: '600', letterSpacing: '0.04em' }}>
              AUTO-SAVED VERSION AVAILABLE
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px'
          }}
          title="Close Recovery Panel"
        >
          ✕
        </button>
      </div>

      {/* Description Text & Interactive List of Recovered Workflows */}
      <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto' }}>
        <p style={{
          margin: '0 0 14px 0',
          fontSize: '12px',
          lineHeight: '1.5',
          color: 'var(--text-secondary)'
        }}>
          VectorShift Studio recovered unsaved workflow files from a recent session close or power cut.
          Click any workflow below to preview it in the background, then decide whether to restore or start fresh.
        </p>

        {/* Recovered Workflows List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {backupData.workflows.map((wf) => {
            const isSelected = previewWfId === wf.id;
            const nodeCount = wf.nodes?.length || 0;
            const edgeCount = wf.edges?.length || 0;

            return (
              <div
                key={wf.id}
                onClick={() => handleSelectPreview(wf)}
                title="Click to preview this workflow on background canvas"
                style={{
                  background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-input)',
                  border: isSelected ? '1.5px solid #3B82F6' : '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.15)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    color: isSelected ? '#2563EB' : '#3B82F6',
                    background: isSelected ? 'rgba(37, 99, 235, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    {isSelected ? '👁️ Previewing Canvas' : 'Auto-Recovered File'}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {timeFormatted}
                  </span>
                </div>

                <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {wf.name || 'Untitled Workflow'}
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Contains <strong style={{ color: 'var(--text-primary)' }}>{nodeCount} nodes</strong> and <strong style={{ color: 'var(--text-primary)' }}>{edgeCount} connection lines</strong>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Action Buttons */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid var(--border-color)',
        background: 'var(--bg-header)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <button
          type="button"
          onClick={handleRestore}
          style={{
            width: '100%',
            padding: '10px 16px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            border: 'none',
            color: '#FFFFFF',
            fontWeight: '600',
            fontSize: '12px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontFamily: 'var(--font-sans)',
            transition: 'all 0.15s ease'
          }}
        >
          <span>🛡️</span> Restore Recovered Work
        </button>

        <button
          type="button"
          onClick={handleDiscard}
          style={{
            width: '100%',
            padding: '8px 16px',
            borderRadius: '8px',
            background: 'transparent',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            fontWeight: '500',
            fontSize: '12px',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            transition: 'all 0.15s ease'
          }}
        >
          Discard & Start Fresh
        </button>
      </div>

      <style>{`
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-100%); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};
