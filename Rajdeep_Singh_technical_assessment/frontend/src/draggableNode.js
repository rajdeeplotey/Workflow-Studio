// draggableNode.js

const nodeIcons = {
  customInput: '📥',
  customOutput: '📤',
  llm: '🤖',
  text: '📝',
  math: '🔢',
  filter: '🔍',
  timer: '⏱️',
  api: '🌐',
  database: '🗄️'
};

const nodeAccents = {
  customInput: { bg: 'rgba(6, 182, 212, 0.16)', border: 'rgba(6, 182, 212, 0.45)', text: 'var(--text-primary)' },
  customOutput: { bg: 'rgba(245, 158, 11, 0.16)', border: 'rgba(245, 158, 11, 0.45)', text: 'var(--text-primary)' },
  llm: { bg: 'rgba(99, 102, 241, 0.16)', border: 'rgba(99, 102, 241, 0.45)', text: 'var(--text-primary)' },
  text: { bg: 'rgba(244, 63, 94, 0.16)', border: 'rgba(244, 63, 94, 0.45)', text: 'var(--text-primary)' },
  math: { bg: 'rgba(59, 130, 246, 0.16)', border: 'rgba(59, 130, 246, 0.45)', text: 'var(--text-primary)' },
  filter: { bg: 'rgba(16, 185, 129, 0.16)', border: 'rgba(16, 185, 129, 0.45)', text: 'var(--text-primary)' },
  timer: { bg: 'rgba(168, 85, 247, 0.16)', border: 'rgba(168, 85, 247, 0.45)', text: 'var(--text-primary)' },
  api: { bg: 'rgba(14, 165, 233, 0.16)', border: 'rgba(14, 165, 233, 0.45)', text: 'var(--text-primary)' },
  database: { bg: 'rgba(217, 119, 6, 0.16)', border: 'rgba(217, 119, 6, 0.45)', text: 'var(--text-primary)' }
};

export const DraggableNode = ({ type, label }) => {
    const onDragStart = (event, nodeType) => {
      const appData = { nodeType }
      event.target.style.cursor = 'grabbing';
      event.dataTransfer.setData('application/reactflow', JSON.stringify(appData));
      event.dataTransfer.effectAllowed = 'move';
    };

    const styleConfig = nodeAccents[type] || { bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.15)', text: 'var(--text-primary)' };

    return (
      <div
        className={type}
        onDragStart={(event) => onDragStart(event, type)}
        onDragEnd={(event) => (event.target.style.cursor = 'grab')}
        style={{
          cursor: 'grab',
          padding: '6px 14px',
          height: '32px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          borderRadius: '8px',
          backgroundColor: styleConfig.bg,
          border: `1px solid ${styleConfig.border}`,
          justifyContent: 'center',
          fontFamily: "var(--font-sans)",
          fontSize: '11px',
          fontWeight: '600',
          letterSpacing: '0.4px',
          color: styleConfig.text,
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          userSelect: 'none'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
          e.currentTarget.style.boxShadow = `0 4px 12px ${styleConfig.bg}`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = 'none';
        }}
        draggable
      >
        <span style={{ fontSize: '13px' }}>{nodeIcons[type] || '⚡'}</span>
        <span>{label}</span>
      </div>
    );
  };