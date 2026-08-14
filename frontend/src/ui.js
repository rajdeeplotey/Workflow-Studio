// ui.js
// Displays the drag-and-drop UI
// --------------------------------------------------

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import ReactFlow, { Controls, Background, MiniMap, BackgroundVariant } from 'reactflow';
import { useStore } from './store';
import { shallow } from 'zustand/shallow';
import { InputNode } from './nodes/inputNode';
import { LLMNode } from './nodes/llmNode';
import { OutputNode } from './nodes/outputNode';
import { TextNode } from './nodes/textNode';
import { MathNode } from './nodes/mathNode';
import { FilterNode } from './nodes/filterNode';
import { TimerNode } from './nodes/timerNode';
import { ApiNode } from './nodes/apiNode';
import { DatabaseNode } from './nodes/databaseNode';
import { DocumentNode } from './nodes/documentNode';
import { RAGSearchNode } from './nodes/ragSearchNode';
import { AgentNode } from './nodes/agentNode';

import 'reactflow/dist/style.css';

// Accent color mapping for edges
const accentColors = {
  customInput: '#22D3EE',
  customOutput: '#FBBF24',
  llm: '#818CF8',
  text: '#FB7185',
  math: '#60A5FA',
  filter: '#34D399',
  timer: '#C084FC',
  api: '#38BDF8',
  database: '#FBBF24',
  document: '#EAB308',
  ragSearch: '#14B8A6',
  agent: '#8B5CF6'
};

const gridSize = 16;
const proOptions = { hideAttribution: true };
const nodeTypes = {
  customInput: InputNode,
  llm: LLMNode,
  customOutput: OutputNode,
  text: TextNode,
  math: MathNode,
  filter: FilterNode,
  timer: TimerNode,
  api: ApiNode,
  database: DatabaseNode,
  document: DocumentNode,
  ragSearch: RAGSearchNode,
  agent: AgentNode
};

const selector = (state) => ({
  nodes: state.nodes,
  edges: state.edges,
  appearance: state.appearance,
  interactionMode: state.interactionMode,
  getNodeID: state.getNodeID,
  addNode: state.addNode,
  deleteEdge: state.deleteEdge,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  undo: state.undo,
  redo: state.redo,
  copySelection: state.copySelection,
  pasteClipboard: state.pasteClipboard
});

export const PipelineUI = () => {
    const reactFlowWrapper = useRef(null);
    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    
    const {
      nodes,
      edges,
      appearance,
      interactionMode,
      getNodeID,
      addNode,
      deleteEdge,
      onNodesChange,
      onEdgesChange,
      onConnect,
      undo,
      redo,
      copySelection,
      pasteClipboard
    } = useStore(selector, shallow);

    // Global Keydown Handler: Ctrl+Z / Ctrl+Y / Ctrl+C / Ctrl+V
    useEffect(() => {
      const handleKeyDown = (e) => {
        // Ignore if user is currently typing inside an input/textarea/select
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
          return;
        }

        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
        const key = e.key.toLowerCase();

        if (isCmdOrCtrl && key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        } else if (isCmdOrCtrl && key === 'y') {
          e.preventDefault();
          redo();
        } else if (isCmdOrCtrl && key === 'c') {
          copySelection();
        } else if (isCmdOrCtrl && key === 'v') {
          e.preventDefault();
          pasteClipboard();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, copySelection, pasteClipboard]);

    const getInitNodeData = (nodeID, type) => {
      const typeDefaults = {
        customInput: { inputName: nodeID.replace('customInput-', 'input_'), inputType: 'Text' },
        customOutput: { outputName: nodeID.replace('customOutput-', 'output_'), outputType: 'Text' },
        llm: { system: '', prompt: '{{input}}', tools_enabled: false },
        text: { text: '{{input}}' },
        math: { operation: 'add', operand: 0 },
        filter: { condition: 'equals', value: '' },
        timer: { delay: 1 },
        api: { method: 'GET', url: 'https://jsonplaceholder.typicode.com/posts/1', body: '' },
        database: { query: 'SELECT * FROM table', connection: 'default' },
        document: { title: 'Sample Document', text: 'Workflow Studio AI features document context.' },
        ragSearch: { query: '{{input}}', top_k: 3 },
        agent: { goal: 'Process workflow goal using tools', max_steps: 3 }
      };
      return { id: nodeID, nodeType: `${type}`, ...typeDefaults[type] };
    };

    const onDrop = useCallback(
        (event) => {
          event.preventDefault();
    
          const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
          if (event?.dataTransfer?.getData('application/reactflow')) {
            const appData = JSON.parse(event.dataTransfer.getData('application/reactflow'));
            const type = appData?.nodeType;
      
            // check if the dropped element is valid
            if (typeof type === 'undefined' || !type) {
              return;
            }
      
            // If no active workflows exist, auto-create Untitled 1 workflow tab first!
            const currentWorkflows = useStore.getState().workflows;
            if (!currentWorkflows || currentWorkflows.length === 0) {
              useStore.getState().createWorkflow();
            }

            const position = reactFlowInstance.project({
              x: event.clientX - reactFlowBounds.left,
              y: event.clientY - reactFlowBounds.top,
            });

            const nodeID = getNodeID(type);
            const newNode = {
              id: nodeID,
              type,
              position,
              data: getInitNodeData(nodeID, type),
            };
      
            addNode(newNode);
          }
        },
        [reactFlowInstance, getNodeID, addNode]
    );

    const onDragOver = useCallback((event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    // Double-click on edge deletes edge ONLY in Hand Pan Mode (suppressed in Arrow Selection Mode)
    const onEdgeDoubleClick = useCallback((event, edge) => {
      if (interactionMode === 'arrow') return; // Dedicated strictly for selection
      event.stopPropagation();
      deleteEdge(edge.id);
    }, [deleteEdge, interactionMode]);

    // Ensure dragging a single node only moves that node unless shift key is held for multi-selection
    const onNodeDragStart = useCallback((event, node) => {
      if (!event.shiftKey) {
        useStore.setState({
          nodes: useStore.getState().nodes.map((n) => ({
            ...n,
            selected: n.id === node.id
          }))
        });
      }
    }, []);

    // Add glowing accent color to edges based on source node type
    const edgesWithColors = useMemo(() => {
      return edges.map(edge => {
        const sourceNode = nodes.find(node => node.id === edge.source);
        const accentColor = sourceNode ? accentColors[sourceNode.type] || '#818CF8' : '#818CF8';
        return {
          ...edge,
          animated: true,
          style: {
            stroke: accentColor,
            strokeWidth: 2.5,
            filter: `drop-shadow(0 0 6px ${accentColor}80)`,
            cursor: interactionMode === 'arrow' ? 'default' : 'pointer'
          }
        };
      });
    }, [edges, nodes, interactionMode]);

    const dotColors = {
      default: '#A39A88',
      light: '#94A3B8',
      dark: '#364566'
    };

    const maskColors = {
      default: 'rgba(255, 254, 251, 0.85)',
      light: 'rgba(248, 250, 252, 0.85)',
      dark: 'rgba(13, 18, 31, 0.85)'
    };

    return (
        <div
          ref={reactFlowWrapper}
          className={`interaction-mode-${interactionMode}`}
          style={{ width: '100%', height: '100%', backgroundColor: 'var(--bg-canvas)' }}
        >
            <ReactFlow
                nodes={nodes}
                edges={edgesWithColors}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeDragStart={onNodeDragStart}
                onEdgeDoubleClick={onEdgeDoubleClick}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onInit={setReactFlowInstance}
                nodeTypes={nodeTypes}
                proOptions={proOptions}
                snapGrid={[gridSize, gridSize]}
                connectionLineType='bezier'
                panOnDrag={interactionMode === 'hand'}
                selectionOnDrag={interactionMode === 'arrow'}
                zoomOnScroll={true}
                zoomOnPinch={true}
                panOnScroll={false}
                preventScrolling={true}
                selectionMode="partial"
                nodesDraggable={true}
                selectNodesOnDrag={false}
                nodesConnectable={interactionMode === 'hand'}
                fitView
                defaultEdgeOptions={{
                    type: 'smoothstep',
                    animated: true,
                    style: { strokeWidth: 2.5 }
                }}
            >
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={16}
                  size={1.5}
                  color={dotColors[appearance] || dotColors.default}
                />
                <Controls position="bottom-right" />
                <MiniMap
                  position="bottom-left"
                  nodeColor={(node) => accentColors[node.type] || '#5B4824'}
                  maskColor={maskColors[appearance] || maskColors.default}
                />
            </ReactFlow>
        </div>
    );
};
