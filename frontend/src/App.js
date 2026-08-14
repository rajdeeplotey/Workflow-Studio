import { useState, useEffect } from 'react';
import { PipelineToolbar } from './toolbar';
import { PipelineUI } from './ui';
import { SubmitButton } from './submit';
import { WorkflowTabs } from './WorkflowTabs';
import { SettingsDropdown } from './SettingsDropdown';
import { DocumentRecoverySidebar } from './DocumentRecoverySidebar';
import { useStore, restoreHandlesFromIDB } from './store';

function App() {
  const [backendOnline, setBackendOnline] = useState(false);

  const { nodes, edges, appearance, workflows, activeWorkflowId } = useStore((state) => ({
    nodes: state.nodes,
    edges: state.edges,
    appearance: state.appearance,
    workflows: state.workflows,
    activeWorkflowId: state.activeWorkflowId
  }));

  // Sync data-theme attribute on <html> element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', appearance);
  }, [appearance]);

  // Live Backend Health Polling Check (Ping -> Pong check on http://127.0.0.1:8000/)
  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const res = await fetch('http://127.0.0.1:8000/', {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          setBackendOnline(true);
        } else {
          setBackendOnline(false);
        }
      } catch (err) {
        setBackendOnline(false);
      }
    };

    checkBackendStatus();
    const interval = setInterval(checkBackendStatus, 3000); // Check status every 3 seconds
    return () => clearInterval(interval);
  }, []);

  // Verify saved laptop files on mount, restore IndexedDB file handles, and poll every 2 seconds for computer file deletions
  useEffect(() => {
    const checkFiles = () => {
      useStore.getState().verifyLaptopFiles();
    };

    // Restore IDB handles then check files
    restoreHandlesFromIDB().then(() => {
      checkFiles();
    });

    const fileCheckInterval = setInterval(checkFiles, 2000);
    window.addEventListener('focus', checkFiles);

    return () => {
      clearInterval(fileCheckInterval);
      window.removeEventListener('focus', checkFiles);
    };
  }, []);

  // Attach native browser beforeunload listener so closing tab displays standard Leave / Cancel prompt
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const activeWf = workflows.find((w) => w.id === activeWorkflowId);
      const isUnsaved = activeWf && !activeWf.hasBeenFileSaved && (nodes.length > 0 || edges.length > 0);
      
      if (isUnsaved) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [nodes, edges, workflows, activeWorkflowId]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: 'var(--bg-canvas)',
      fontFamily: "var(--font-sans)",
      color: 'var(--text-primary)',
      overflow: 'hidden',
      transition: 'background-color 0.25s ease, color 0.25s ease'
    }}>
      {/* Excel-Style Document Recovery Sidebar (Appears on power cut / crash recovery) */}
      <DocumentRecoverySidebar />

      {/* Top Navigation Header */}
      <header style={{
        backgroundColor: 'var(--bg-header)',
        backdropFilter: 'blur(16px)',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border-color)',
        zIndex: 20,
        transition: 'background-color 0.25s ease, border-color 0.25s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Logo from public/logo.jpg */}
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
            backgroundColor: 'var(--bg-card)'
          }}>
            <img 
              src={process.env.PUBLIC_URL + '/logo.jpg'} 
              alt="Workflow Studio Logo" 
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
            <span style={{ display: 'none', fontSize: '14px', fontWeight: '400', color: 'var(--text-primary)' }}>WS</span>
          </div>
          <div>
            <h1 style={{
              color: 'var(--text-primary)',
              margin: 0,
              fontSize: '15px',
              fontWeight: '500',
              letterSpacing: '0.3px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              Workflow Studio
            </h1>
            <span style={{
              color: 'var(--text-muted)',
              fontSize: '11px',
              fontFamily: "var(--font-mono)",
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}>
              NODE-BASED PIPELINE ENGINE
            </span>
          </div>
        </div>

        {/* Right Section: Canvas Stats, Real-time Backend Health Status & Settings Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Clean Inter Sans-serif Live Canvas Stats Readout */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 12px',
            borderRadius: '6px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            fontSize: '11px',
            fontFamily: "var(--font-sans)",
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{
                color: 'var(--text-muted)',
                fontSize: '10px',
                fontWeight: '400',
                letterSpacing: '0.06em',
                textTransform: 'uppercase'
              }}>
                Nodes:
              </span>
              <span style={{
                color: 'var(--text-primary)',
                fontWeight: '400',
                fontSize: '11px'
              }}>
                {nodes.length}
              </span>
            </span>
            
            <span style={{ color: 'var(--border-hover)', opacity: 0.6, margin: '0 2px' }}>|</span>
            
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{
                color: 'var(--text-muted)',
                fontSize: '10px',
                fontWeight: '400',
                letterSpacing: '0.06em',
                textTransform: 'uppercase'
              }}>
                Edges:
              </span>
              <span style={{
                color: 'var(--text-primary)',
                fontWeight: '400',
                fontSize: '11px'
              }}>
                {edges.length}
              </span>
            </span>
          </div>

          {/* Dynamic Real-time Backend Health Indicator */}
          <div 
            title={backendOnline ? "FastAPI backend is online on http://127.0.0.1:8000" : "FastAPI backend is offline or stopped. Run 'uvicorn main:app --reload' in backend folder"}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              background: backendOnline ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: backendOnline ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
              fontSize: '11px',
              fontWeight: '400',
              color: backendOnline ? '#10B981' : '#EF4444',
              fontFamily: "var(--font-sans)",
              transition: 'all 0.3s ease'
            }}
          >
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: backendOnline ? '#10B981' : '#EF4444',
              boxShadow: backendOnline ? '0 0 8px #10B981' : '0 0 8px #EF4444'
            }}></span>
            {backendOnline ? 'Backend Ready' : 'Backend Offline'}
          </div>

          {/* Three Dots Settings Dropdown Menu (Trash & Appearance Submenu) */}
          <SettingsDropdown />
        </div>
      </header>

      {/* Component Palette Toolbar */}
      <PipelineToolbar />

      {/* Main Flow Canvas Area */}
      <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
        <PipelineUI />
      </div>

      {/* Footer Bar: Excel-Style Sheet Tabs on Left, Submit Button on Right */}
      <footer style={{
        backgroundColor: 'var(--bg-header)',
        backdropFilter: 'blur(16px)',
        padding: '8px 24px',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 20,
        transition: 'background-color 0.25s ease, border-color 0.25s ease'
      }}>
        <WorkflowTabs />
        <SubmitButton />
      </footer>
    </div>
  );
}

export default App;
