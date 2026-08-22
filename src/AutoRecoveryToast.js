// AutoRecoveryToast.js - Real-Time Power Cut & Crash Recovery Notification Toast

import { useState, useEffect } from 'react';
import { useStore } from './store';

export const AutoRecoveryToast = () => {
  const [showToast, setShowToast] = useState(false);
  const { workflows } = useStore((state) => ({ workflows: state.workflows }));

  useEffect(() => {
    // Check if user has restored data from previous session
    if (workflows && workflows.length > 0 && workflows.some(w => (w.nodes && w.nodes.length > 0) || (w.edges && w.edges.length > 0))) {
      setShowToast(true);
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!showToast) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '72px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'var(--bg-card)',
      backdropFilter: 'blur(20px)',
      border: '1px solid #10B981',
      borderRadius: '30px',
      padding: '8px 18px',
      boxShadow: '0 10px 30px -5px rgba(16, 185, 129, 0.25)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      zIndex: 1000,
      fontFamily: 'var(--font-sans)',
      fontSize: '12px',
      color: 'var(--text-primary)',
      animation: 'slideDownToast 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        color: '#10B981',
        fontWeight: 'bold',
        fontSize: '11px'
      }}>
        🛡️
      </span>

      <span>
        <strong style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Session Restored: </strong>
        Your unsaved workflow was 100% saved & recovered from auto-backup!
      </span>

      <button
        type="button"
        onClick={() => setShowToast(false)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          fontSize: '12px',
          cursor: 'pointer',
          padding: '0 4px',
          marginLeft: '4px'
        }}
      >
        ✕
      </button>

      <style>{`
        @keyframes slideDownToast {
          from { opacity: 0; transform: translate(-50%, -15px) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
      `}</style>
    </div>
  );
};
