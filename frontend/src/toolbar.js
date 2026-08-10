// toolbar.js - Single Arrow Selection Icon Toolbar

import { DraggableNode } from './draggableNode';
import { SaveButton } from './SaveButton';
import { useStore } from './store';

// SVG Icon for Selection Cursor (45° Pointer Arrow Tool)
const CursorIcon = ({ size = 16, active = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M4 3L11.5 20.5L14.8 13.2L22 9.9L4 3Z"
      fill={active ? '#2563EB' : 'var(--text-primary)'}
      stroke={active ? '#1D4ED8' : 'var(--text-primary)'}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

export const PipelineToolbar = () => {
    const { interactionMode, toggleInteractionMode } = useStore((state) => ({
      interactionMode: state.interactionMode,
      toggleInteractionMode: state.toggleInteractionMode
    }));

    return (
        <div style={{
            padding: '12px 24px',
            backgroundColor: 'var(--bg-header)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            transition: 'background-color 0.25s ease, border-color 0.25s ease'
        }}>
            {/* Left Side: Palette Node Chips */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginRight: '8px',
                    paddingRight: '12px',
                    borderRight: '1px solid var(--border-color)'
                }}>
                    <span style={{ fontSize: '14px' }}>🧩</span>
                    <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: 'var(--text-muted)',
                        fontFamily: "var(--font-sans)",
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase'
                    }}>
                        Palette
                    </span>
                </div>
                
                <DraggableNode type='customInput' label='Input' />
                <DraggableNode type='llm' label='LLM' />
                <DraggableNode type='customOutput' label='Output' />
                <DraggableNode type='text' label='Text' />
                <DraggableNode type='math' label='Math' />
                <DraggableNode type='filter' label='Filter' />
                <DraggableNode type='timer' label='Timer' />
                <DraggableNode type='api' label='API' />
                <DraggableNode type='database' label='Database' />
            </div>

            {/* Right Side: Single Arrow Selection Icon & Save Button in front of Drag to Canvas */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11px',
                color: 'var(--text-muted)',
                fontFamily: "var(--font-sans)",
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
            }}>
                {/* Single Arrow Selection Tool Icon Button */}
                <button
                  type="button"
                  onClick={toggleInteractionMode}
                  title={interactionMode === 'arrow' ? 'Selection Tool Active (Click to deactivate and return to Pan Mode)' : 'Activate Selection Tool (Drag to Box Select)'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '30px',
                    height: '30px',
                    borderRadius: '8px',
                    backgroundColor: interactionMode === 'arrow' ? 'rgba(37, 99, 235, 0.18)' : 'var(--bg-input)',
                    border: interactionMode === 'arrow' ? '1.5px solid #2563EB' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: interactionMode === 'arrow' ? '0 0 10px rgba(37, 99, 235, 0.25)' : '0 1px 3px rgba(0, 0, 0, 0.08)',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    if (interactionMode !== 'arrow') {
                      e.currentTarget.style.borderColor = '#2563EB';
                      e.currentTarget.style.backgroundColor = 'var(--bg-card)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (interactionMode !== 'arrow') {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.backgroundColor = 'var(--bg-input)';
                    }
                  }}
                >
                  <CursorIcon size={16} active={interactionMode === 'arrow'} />
                </button>

                {/* Authentic Blue Floppy Save Icon Button */}
                <SaveButton />

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: 0.8,
                  marginLeft: '6px'
                }}>
                  <span>Drag to Canvas</span>
                  <span>↳</span>
                </div>
            </div>
        </div>
    );
};
