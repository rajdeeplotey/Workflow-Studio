// BaseNode.js
// Abstracted node component that renders all node types through configuration

import { React, Fragment } from 'react';
import { Handle, Position } from 'reactflow';
import { useStore } from '../store';
import './BaseNode.css';

export const BaseNode = ({ id, data, config }) => {
  const { deleteNode, updateNodeField } = useStore();

  const handleFieldChange = (fieldName, value) => {
    updateNodeField(id, fieldName, value);
    if (config.onFieldChange) {
      config.onFieldChange(fieldName, value);
    }
  };

  const getFieldValue = (fieldName, field) => {
    if (data[fieldName] !== undefined) {
      return data[fieldName];
    }
    if (field.defaultValue !== undefined) {
      if (typeof field.defaultValue === 'function') {
        return field.defaultValue(id);
      }
      return field.defaultValue;
    }
    return '';
  };

  const renderField = (field) => {
    const value = getFieldValue(field.name, field);
    const baseProps = {
      className: 'nodrag basenode-input',
      value: value,
      onChange: (e) => handleFieldChange(field.name, e.target.value),
      placeholder: field.placeholder
    };

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            {...baseProps}
            className="nodrag basenode-textarea"
            rows={field.rows || 3}
          />
        );
      case 'select':
        return (
          <select {...baseProps} className="nodrag basenode-select">
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case 'number':
        return (
          <input
            {...baseProps}
            className="nodrag basenode-number"
            type="number"
            step={field.step || 1}
          />
        );
      case 'text':
      default:
        return <input {...baseProps} type="text" />;
    }
  };

  // Only render handle text labels if specifically enabled (e.g. for LLM node)
  const isLLMNode = config.title === 'LLM' || config.showHandleLabels === true;

  const renderHandles = (handles) => {
    const groupedBySide = handles.reduce((acc, handle) => {
      if (!acc[handle.position]) {
        acc[handle.position] = [];
      }
      acc[handle.position].push(handle);
      return acc;
    }, {});

    const positionMap = {
      left: Position.Left,
      right: Position.Right,
      top: Position.Top,
      bottom: Position.Bottom
    };

    return Object.entries(groupedBySide).map(([position, sideHandles]) => {
      // Auto-space handles if top is not specified
      const handlesWithPositions = sideHandles.map((handle, index) => {
        if (handle.top !== undefined) {
          return handle;
        }
        const spacing = 100 / (sideHandles.length + 1);
        return { ...handle, top: spacing * (index + 1) };
      });

      return handlesWithPositions.map((handle) => {
        const isLeft = position === 'left';
        const isRight = position === 'right';

        return (
          <Fragment key={handle.id}>
            {/* Native React Flow Handle Component Anchored on Border Line */}
            <Handle
              type={handle.type}
              position={positionMap[position]}
              id={handle.id}
              isConnectable={true}
              style={{
                top: `${handle.top}%`,
                width: '9px',
                height: '9px',
                backgroundColor: '#FFFFFF',
                border: `2px solid ${config.accent || '#6366F1'}`,
                borderRadius: '50%',
                zIndex: 100
              }}
            />

            {/* Plain Text Label Adjacent to Handle Dot (Rendered ONLY for LLM Node) */}
            {isLLMNode && handle.label && (
              <span
                className="basenode-handle-label"
                style={{
                  position: 'absolute',
                  top: `${handle.top}%`,
                  transform: 'translateY(-50%)',
                  color: config.accent || '#6366F1',
                  left: isLeft ? '10px' : 'auto',
                  right: isRight ? '10px' : 'auto',
                  textAlign: isRight ? 'right' : 'left'
                }}
              >
                {handle.label}
              </span>
            )}
          </Fragment>
        );
      });
    });
  };

  // Get sequential instance number from node id (e.g. 'llm-1' -> 1)
  const getNodeNumber = (nodeId) => {
    if (!nodeId) return '';
    const num = nodeId.split('-').pop();
    return isNaN(num) ? num : parseInt(num, 10);
  };

  // Render status badge (Pending / Running / Success / Error)
  const renderStatusBadge = () => {
    const status = data.status;
    if (!status) return null;

    let badgeStyle = {
      fontSize: '10px',
      fontWeight: '700',
      padding: '2px 6px',
      borderRadius: '4px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      textTransform: 'uppercase',
      letterSpacing: '0.04em'
    };

    if (status === 'success') {
      badgeStyle = { ...badgeStyle, background: 'rgba(16, 185, 129, 0.25)', color: '#10B981', border: '1px solid #10B981' };
      return <span style={badgeStyle}>✓ Success</span>;
    } else if (status === 'error') {
      badgeStyle = { ...badgeStyle, background: 'rgba(239, 68, 68, 0.25)', color: '#EF4444', border: '1px solid #EF4444' };
      return <span style={badgeStyle}>⚠️ Error</span>;
    } else if (status === 'running') {
      badgeStyle = { ...badgeStyle, background: 'rgba(245, 158, 11, 0.25)', color: '#F59E0B', border: '1px solid #F59E0B' };
      return <span style={badgeStyle}>⏳ Running</span>;
    } else if (status === 'pending') {
      badgeStyle = { ...badgeStyle, background: 'rgba(148, 163, 184, 0.25)', color: '#94A3B8', border: '1px solid #94A3B8' };
      return <span style={badgeStyle}>• Pending</span>;
    }
    return null;
  };

  return (
    <div
      className="basenode-container"
      style={{
        width: config.width || 220,
        minHeight: config.minHeight || 80,
        borderColor: data.status === 'error' ? '#EF4444' : data.status === 'success' ? '#10B981' : undefined
      }}
    >
      {/* Floating Delete Cross Button with Proportional SVG Vector */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          deleteNode(id);
        }}
        className="nodrag basenode-delete-btn"
        title="Delete Node"
      >
        <svg width="7.5" height="7.5" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M1.8 1.8L8.2 8.2M1.8 8.2L8.2 1.8" />
        </svg>
      </button>

      {/* Header: Type Name on Left, Status Badge & Instance Number on Right */}
      <div
        className="basenode-header"
        style={{
          background: config.accent || '#6366F1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          {config.icon && <span className="basenode-icon">{config.icon}</span>}
          <span className="basenode-title" style={{ fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {config.title}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {renderStatusBadge()}
          <span style={{
            fontSize: '11px',
            fontWeight: '700',
            opacity: 0.9,
            padding: '1px 6px',
            borderRadius: '4px',
            background: 'rgba(0, 0, 0, 0.18)',
            color: '#FFFFFF',
            fontFamily: 'var(--font-sans)'
          }}>
            {getNodeNumber(id)}
          </span>
        </div>
      </div>

      {/* Handles & Labels */}
      {config.handles && renderHandles(config.handles)}

      {/* Fields */}
      {config.fields && config.fields.length > 0 && (
        <div className="basenode-fields">
          {config.fields.map((field) => (
            <div key={field.name} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="basenode-field-label">
                {field.label}
              </label>
              {renderField(field)}
            </div>
          ))}
        </div>
      )}

      {/* Children slot for node-specific extras */}
      {config.children && <div className="basenode-fields">{config.children}</div>}

      {/* Inline Node Execution Error Message Banner */}
      {data.error && (
        <div style={{
          margin: '8px',
          padding: '8px',
          borderRadius: '6px',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#EF4444',
          fontSize: '11px',
          lineHeight: '1.4',
          wordBreak: 'break-word'
        }}>
          <strong>Error:</strong> {data.error}
        </div>
      )}

      {/* Inline Node Execution Output Display (if no children slot used) */}
      {!config.children && data.output !== undefined && !data.error && (
        <div style={{
          margin: '8px',
          padding: '8px',
          borderRadius: '6px',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-color)',
          fontSize: '11px',
          color: 'var(--text-primary)',
          maxHeight: '120px',
          overflowY: 'auto'
        }}>
          <div style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '3px' }}>
            Output:
          </div>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
            {typeof data.output === 'object' ? JSON.stringify(data.output, null, 2) : String(data.output)}
          </pre>
        </div>
      )}
    </div>
  );
};

