// SettingsDropdown.js - Three Dots Settings Dropdown with Accordion Appearance Arrow, Trash, & PDF/DOCX Download

import { useState, useRef, useEffect } from 'react';
import { useStore } from './store';
import { TrashModal } from './TrashModal';

const ThreeDotsIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="1.5" fill="currentColor" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    <circle cx="12" cy="19" r="1.5" fill="currentColor" />
  </svg>
);

export const SettingsDropdown = () => {
  const { appearance, setAppearance, trash } = useStore((state) => ({
    appearance: state.appearance,
    setAppearance: state.setAppearance,
    trash: state.trash
  }));

  const [isOpen, setIsOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click anywhere outside (using capture phase to bypass ReactFlow event stopping)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowAppearance(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('pointerdown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('pointerdown', handleClickOutside, true);
    };
  }, []);

  const themeOptions = [
    { id: 'default', label: 'Default' },
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' }
  ];

  return (
    <>
      {/* Trash Modal */}
      <TrashModal
        isOpen={isTrashOpen}
        onClose={() => setIsTrashOpen(false)}
      />

      <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
        {/* Three Dots Icon Trigger Button */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            setShowAppearance(false);
          }}
          title="Settings & Studio Options"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: isOpen ? 'var(--bg-card-hover)' : 'var(--bg-input)',
            border: isOpen ? '1px solid var(--accent)' : '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            if (!isOpen) {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.backgroundColor = 'var(--bg-card)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isOpen) {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.backgroundColor = 'var(--bg-input)';
            }
          }}
        >
          <ThreeDotsIcon size={16} />
          {trash.length > 0 && (
            <span style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#EF4444'
            }} />
          )}
        </button>

        {/* Dropdown Menu Panel */}
        {isOpen && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: '190px',
            backgroundColor: 'var(--bg-card)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            boxShadow: '0 15px 35px -5px rgba(0, 0, 0, 0.3)',
            padding: '6px',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            animation: 'fadeIn 0.15s ease-out'
          }}>
            {/* 1. Trash Menu Item */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsTrashOpen(true);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>🗑️</span>
                <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>
                  Trash
                </span>
              </div>

              {trash.length > 0 && (
                <span style={{
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#EF4444',
                  fontSize: '10px',
                  fontWeight: '600'
                }}>
                  {trash.length}
                </span>
              )}
            </button>

            <div style={{
              height: '1px',
              backgroundColor: 'var(--border-color)',
              margin: '2px 0'
            }} />

            {/* 2. Appearance Item with Arrow Indicator */}
            <button
              type="button"
              onClick={() => setShowAppearance(!showAppearance)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                background: showAppearance ? 'var(--bg-input-focus)' : 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!showAppearance) e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
              }}
              onMouseLeave={(e) => {
                if (!showAppearance) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>🎨</span>
                <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>
                  Appearance
                </span>
              </div>
              <span style={{
                fontSize: '9px',
                transform: showAppearance ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
                opacity: 0.7
              }}>
                ▼
              </span>
            </button>

            {/* Expandable Theme Options: Default, Light, Dark */}
            {showAppearance && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                paddingLeft: '12px',
                marginTop: '2px',
                borderLeft: '2px solid var(--border-color)',
                marginLeft: '12px'
              }}>
                {themeOptions.map((opt) => {
                  const isSelected = appearance === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setAppearance(opt.id);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        fontWeight: isSelected ? '600' : '400',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }
                      }}
                    >
                      <span>{opt.label}</span>
                      {isSelected && (
                        <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 'bold' }}>✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

          </div>
        )}
      </div>
    </>
  );
};
