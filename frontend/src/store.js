// store.js - Multi-Workflow Store with Computer File Deletion Auto-Detection & 30-Day Studio Trash Retention

import { create } from "zustand";
import {
    addEdge,
    applyNodeChanges,
    applyEdgeChanges,
    MarkerType,
  } from 'reactflow';

// Initial appearance from localStorage or 'default' (VectorShift Official Brand)
const initialAppearance = typeof window !== 'undefined'
  ? (localStorage.getItem('vectorshift_appearance') || 'default')
  : 'default';

// 30-Day Retention Policy in milliseconds
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Helper to clone state for history snapshots
const cloneState = (state) => ({
  nodes: JSON.parse(JSON.stringify(state.nodes)),
  edges: JSON.parse(JSON.stringify(state.edges))
});

// IndexedDB setup for persisting FileSystemFileHandle across browser sessions
const DB_NAME = 'VectorShiftStudioDB';
const STORE_NAME = 'file_handles';

const openIDB = () => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
};

export const saveHandleToIDB = async (id, handle) => {
  if (!handle) return;
  try {
    const db = await openIDB();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(handle, id);
  } catch (e) {
    console.warn('Failed to save file handle to IndexedDB:', e);
  }
};

export const deleteHandleFromIDB = async (id) => {
  try {
    const db = await openIDB();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
  } catch (e) {
    console.warn('Failed to delete file handle from IndexedDB:', e);
  }
};

export const getAllHandlesFromIDB = async () => {
  try {
    const db = await openIDB();
    if (!db) return {};
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const handlesMap = {};
      const request = store.openCursor();
      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          handlesMap[cursor.key] = cursor.value;
          cursor.continue();
        } else {
          resolve(handlesMap);
        }
      };
      request.onerror = () => resolve({});
    });
  } catch (e) {
    return {};
  }
};

export const restoreHandlesFromIDB = async () => {
  const handles = await getAllHandlesFromIDB();
  const { workflows } = useStore.getState();
  let updated = false;
  const updatedWorkflows = workflows.map((wf) => {
    if (handles[wf.id] && !wf.fileHandle) {
      updated = true;
      return { ...wf, fileHandle: handles[wf.id] };
    }
    return wf;
  });

  if (updated) {
    useStore.setState({ workflows: updatedWorkflows });
  }
  await useStore.getState().verifyLaptopFiles();
};

// Calculate next sequential workflow name (e.g. Untitled 1, Untitled 2...)
const getNextWorkflowName = (workflows) => {
  if (!workflows || workflows.length === 0) {
    return 'Untitled 1';
  }
  let maxNum = 0;
  workflows.forEach((wf) => {
    const match = wf.name.match(/(?:Untitled|Workflow)\s+(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });
  return `Untitled ${maxNum + 1}`;
};

// 4-Hour Retention Policy for Emergency Auto-Backup (2-4 Hours window)
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

// Load saved workflows or fallback to emergency auto-backup from power outage / PC shutdown
const loadInitialWorkflows = () => {
  if (typeof window === 'undefined') {
    return [{ id: 'wf-1', name: 'Untitled 1', nodes: [], edges: [], nodeIDs: {}, hasBeenFileSaved: false }];
  }
  try {
    const saved = localStorage.getItem('vectorshift_workflows');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    // Emergency Fallback: Check auto-backup snapshot from power cut / unexpected PC shutdown (valid within 4 hours)
    const autoBackup = localStorage.getItem('vectorshift_auto_backup');
    if (autoBackup) {
      const backupParsed = JSON.parse(autoBackup);
      const isFresh = backupParsed && backupParsed.timestamp && (Date.now() - backupParsed.timestamp <= FOUR_HOURS_MS);
      if (isFresh && Array.isArray(backupParsed.workflows) && backupParsed.workflows.length > 0) {
        return backupParsed.workflows;
      } else if (!isFresh) {
        localStorage.removeItem('vectorshift_auto_backup');
      }
    }
  } catch (e) {
    console.error('Failed to parse saved workflows:', e);
  }
  return [{ id: 'wf-1', name: 'Untitled 1', nodes: [], edges: [], nodeIDs: {}, hasBeenFileSaved: false }];
};

const initialWorkflows = loadInitialWorkflows();

const loadInitialActiveId = (workflows) => {
  if (typeof window === 'undefined' || workflows.length === 0) return null;
  const savedId = localStorage.getItem('vectorshift_active_workflow_id');
  if (savedId && workflows.some(w => w.id === savedId)) {
    return savedId;
  }
  return workflows[0]?.id || null;
};

const initialActiveId = loadInitialActiveId(initialWorkflows);
const activeWf = initialWorkflows.find(w => w.id === initialActiveId) || initialWorkflows[0] || { id: null, nodes: [], edges: [] };

// Load initial trash items from localStorage, filtering out items older than 30 days
const loadInitialTrash = () => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('vectorshift_trash');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const now = Date.now();
        // Auto-purge workflows older than 30 days
        const valid = parsed.filter(item => item.deletedAt && (now - item.deletedAt < THIRTY_DAYS_MS));
        return valid;
      }
    }
  } catch (e) {
    console.error('Failed to parse trash workflows:', e);
  }
  return [];
};

const initialTrash = loadInitialTrash();

// Helper to sync state to localStorage with dual redundant emergency backup for power cuts
const persistWorkflows = (workflows, activeId) => {
  if (typeof window === 'undefined') return;
  try {
    if (!workflows || workflows.length === 0) {
      localStorage.removeItem('vectorshift_workflows');
      localStorage.removeItem('vectorshift_auto_backup');
      localStorage.removeItem('vectorshift_active_workflow_id');
      return;
    }

    // Strip fileHandle before JSON serializing to avoid circular structure errors
    const serializable = workflows.map(({ fileHandle, ...rest }) => rest);
    localStorage.setItem('vectorshift_workflows', JSON.stringify(serializable));
    
    // Auto-backup snapshot is ONLY maintained for UNSAVED workflows containing nodes or edges
    const unsavedWorkflows = serializable.filter(
      (w) => !w.hasBeenFileSaved && ((w.nodes && w.nodes.length > 0) || (w.edges && w.edges.length > 0))
    );

    if (unsavedWorkflows.length > 0) {
      localStorage.setItem('vectorshift_auto_backup', JSON.stringify({
        timestamp: Date.now(),
        workflows: unsavedWorkflows,
        activeId: activeId
      }));
    } else {
      localStorage.removeItem('vectorshift_auto_backup');
    }
    
    if (activeId) {
      localStorage.setItem('vectorshift_active_workflow_id', activeId);
    } else {
      localStorage.removeItem('vectorshift_active_workflow_id');
    }
  } catch (e) {
    console.error('Failed to persist workflows to localStorage:', e);
  }
};

const persistTrash = (trashItems) => {
  if (typeof window === 'undefined') return;
  try {
    const serializableTrash = trashItems.map(({ fileHandle, ...rest }) => rest);
    localStorage.setItem('vectorshift_trash', JSON.stringify(serializableTrash));
  } catch (e) {
    console.error('Failed to persist trash to localStorage:', e);
  }
};

export const useStore = create((set, get) => ({
    workflows: initialWorkflows,
    trash: initialTrash,
    activeWorkflowId: activeWf.id,
    nodes: activeWf.nodes || [],
    edges: activeWf.edges || [],
    nodeIDs: activeWf.nodeIDs || {},
    past: [],
    future: [],
    appearance: initialAppearance, // 'default' | 'light' | 'dark'
    interactionMode: 'hand', // 'hand' (pan) | 'arrow' (selection)
    clipboard: { nodes: [], edges: [] },

    setAppearance: (mode) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('vectorshift_appearance', mode);
      }
      set({ appearance: mode });
    },

    toggleInteractionMode: () => {
      const current = get().interactionMode;
      set({ interactionMode: current === 'hand' ? 'arrow' : 'hand' });
    },

    setInteractionMode: (mode) => {
      set({ interactionMode: mode });
    },

    markWorkflowFileSaved: (id, handle) => {
      const { workflows, activeWorkflowId } = get();
      const targetId = id || activeWorkflowId;
      const updatedWorkflows = workflows.map(wf => {
        if (wf.id === targetId) {
          return { ...wf, hasBeenFileSaved: true, fileHandle: handle || wf.fileHandle };
        }
        return wf;
      });
      if (handle) {
        saveHandleToIDB(targetId, handle);
      }
      set({ workflows: updatedWorkflows });
      persistWorkflows(updatedWorkflows, activeWorkflowId);
    },

    // Verify if saved JSON files still exist on the laptop computer / desktop
    verifyLaptopFiles: async () => {
      const { workflows, trash, activeWorkflowId } = get();
      const idbHandles = await getAllHandlesFromIDB();
      const validWorkflows = [];
      const newlyTrashed = [];

      for (const wf of workflows) {
        const handle = wf.fileHandle || idbHandles[wf.id];
        if (wf.hasBeenFileSaved && handle) {
          try {
            await handle.getFile();
            validWorkflows.push({ ...wf, fileHandle: handle });
          } catch (err) {
            // File deleted from computer/desktop/recycle bin
            console.log(`File for workflow "${wf.name}" deleted from computer. Moving to Studio Trash.`);
            deleteHandleFromIDB(wf.id);
            newlyTrashed.push({
              ...JSON.parse(JSON.stringify(wf)),
              fileHandle: null,
              deletedAt: Date.now(),
              deletedFromComputer: true
            });
          }
        } else {
          validWorkflows.push(wf);
        }
      }

      if (newlyTrashed.length > 0) {
        const updatedTrash = [...newlyTrashed, ...trash];
        let newActiveId = activeWorkflowId;
        if (newActiveId && newlyTrashed.some(w => w.id === newActiveId)) {
          newActiveId = validWorkflows[0]?.id || null;
        }

        const activeWf = validWorkflows.find(w => w.id === newActiveId) || validWorkflows[0] || { nodes: [], edges: [] };

        set({
          workflows: validWorkflows,
          activeWorkflowId: newActiveId,
          trash: updatedTrash,
          nodes: activeWf.nodes || [],
          edges: activeWf.edges || []
        });

        persistWorkflows(validWorkflows, newActiveId);
        persistTrash(updatedTrash);
      }
    },

    // Import a JSON workflow file from laptop into active studio tabs
    importWorkflow: (workflowData, handle) => {
      const { workflows } = get();
      const newId = `wf-${Date.now()}`;
      const importedName = workflowData.name || 'Imported Workflow';
      
      const importedWorkflow = {
        id: newId,
        name: importedName,
        nodes: Array.isArray(workflowData.nodes) ? workflowData.nodes : [],
        edges: Array.isArray(workflowData.edges) ? workflowData.edges : [],
        nodeIDs: workflowData.nodeIDs || {},
        hasBeenFileSaved: true,
        fileHandle: handle || null
      };

      if (handle) {
        saveHandleToIDB(newId, handle);
      }

      // Filter out any blank initial default workflow (0 nodes, 0 edges, unsaved)
      const existingNonEmpty = workflows.filter(
        (w) => (w.nodes && w.nodes.length > 0) || (w.edges && w.edges.length > 0) || w.hasBeenFileSaved
      );

      const updatedWorkflows = [...existingNonEmpty, importedWorkflow];
      set({
        workflows: updatedWorkflows,
        activeWorkflowId: newId,
        nodes: importedWorkflow.nodes,
        edges: importedWorkflow.edges,
        nodeIDs: importedWorkflow.nodeIDs,
        past: [],
        future: []
      });
      persistWorkflows(updatedWorkflows, newId);
    },

    // Copy selected nodes & edges to clipboard
    copySelection: () => {
      const { nodes, edges } = get();
      const selectedNodes = nodes.filter(n => n.selected);
      if (selectedNodes.length === 0) return false;

      const selectedNodeIds = new Set(selectedNodes.map(n => n.id));
      const selectedEdges = edges.filter(e => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target));

      set({
        clipboard: {
          nodes: JSON.parse(JSON.stringify(selectedNodes)),
          edges: JSON.parse(JSON.stringify(selectedEdges))
        }
      });
      return true;
    },

    // Paste clipboard nodes & edges into active workflow canvas
    pasteClipboard: () => {
      const { clipboard, nodes, edges, getNodeID } = get();
      if (!clipboard || !clipboard.nodes || clipboard.nodes.length === 0) return false;

      get().pushHistory();

      const idMap = {};
      const newNodes = clipboard.nodes.map(n => {
        const type = n.type || 'text';
        const newId = getNodeID(type);
        idMap[n.id] = newId;

        return {
          ...n,
          id: newId,
          selected: true,
          position: {
            x: (n.position?.x || 100) + 30,
            y: (n.position?.y || 100) + 30
          },
          data: { ...n.data, id: newId }
        };
      });

      const newEdges = clipboard.edges
        .filter(e => idMap[e.source] && idMap[e.target])
        .map(e => ({
          ...e,
          id: `e-${idMap[e.source]}-${idMap[e.target]}-${Date.now()}`,
          source: idMap[e.source],
          target: idMap[e.target]
        }));

      // Deselect existing nodes
      const existingNodes = nodes.map(n => ({ ...n, selected: false }));
      const updatedNodes = [...existingNodes, ...newNodes];
      const updatedEdges = [...edges, ...newEdges];

      set({ nodes: updatedNodes, edges: updatedEdges });
      get().syncActiveWorkflow(updatedNodes, updatedEdges);
      return true;
    },

    // Sync active workflow nodes/edges into workflows array & localStorage
    syncActiveWorkflow: (nodesToSave, edgesToSave) => {
      const { workflows, activeWorkflowId, nodeIDs } = get();
      if (!activeWorkflowId) return;

      const updatedNodes = nodesToSave || get().nodes;
      const updatedEdges = edgesToSave || get().edges;

      const updatedWorkflows = workflows.map((wf) => {
        if (wf.id === activeWorkflowId) {
          return {
            ...wf,
            nodes: JSON.parse(JSON.stringify(updatedNodes)),
            edges: JSON.parse(JSON.stringify(updatedEdges)),
            nodeIDs: { ...nodeIDs }
          };
        }
        return wf;
      });

      set({ workflows: updatedWorkflows });
      persistWorkflows(updatedWorkflows, activeWorkflowId);
    },

    // Create a new Excel-style workflow tab
    createWorkflow: () => {
      const { workflows } = get();
      if (workflows.length > 0) {
        get().syncActiveWorkflow();
      }
      const newId = `wf-${Date.now()}`;
      const newName = getNextWorkflowName(workflows);
      const newWorkflow = {
        id: newId,
        name: newName,
        nodes: [],
        edges: [],
        nodeIDs: {},
        hasBeenFileSaved: false
      };

      const updatedWorkflows = [...workflows, newWorkflow];
      set({
        workflows: updatedWorkflows,
        activeWorkflowId: newId,
        nodes: [],
        edges: [],
        nodeIDs: {},
        past: [],
        future: []
      });
      persistWorkflows(updatedWorkflows, newId);
    },

    // Switch active workflow tab
    switchWorkflow: (id) => {
      const { activeWorkflowId } = get();
      if (id === activeWorkflowId) return;

      // Save current state first
      if (activeWorkflowId) {
        get().syncActiveWorkflow();
      }

      const target = get().workflows.find(w => w.id === id);
      if (!target) return;

      set({
        activeWorkflowId: id,
        nodes: target.nodes || [],
        edges: target.edges || [],
        nodeIDs: target.nodeIDs || {},
        past: [],
        future: []
      });
      persistWorkflows(get().workflows, id);
    },

    // Close a workflow tab directly WITHOUT moving to Trash (used when closing saved tabs or Don't Save)
    closeTab: (id) => {
      const { workflows, activeWorkflowId } = get();
      const updatedWorkflows = workflows.filter(w => w.id !== id);

      if (updatedWorkflows.length === 0) {
        set({
          workflows: [],
          activeWorkflowId: null,
          nodes: [],
          edges: [],
          nodeIDs: {},
          past: [],
          future: []
        });
        persistWorkflows([], null);
        return;
      }

      let newActiveId = activeWorkflowId;
      if (id === activeWorkflowId) {
        newActiveId = updatedWorkflows[0].id;
        const target = updatedWorkflows[0];
        set({
          workflows: updatedWorkflows,
          activeWorkflowId: newActiveId,
          nodes: target.nodes || [],
          edges: target.edges || [],
          nodeIDs: target.nodeIDs || {},
          past: [],
          future: []
        });
      } else {
        set({ workflows: updatedWorkflows });
      }

      persistWorkflows(updatedWorkflows, newActiveId);
    },

    // Delete a workflow tab (Moves to Trash with 30-day retention)
    deleteWorkflow: (id) => {
      const { workflows, activeWorkflowId, trash } = get();

      const targetWf = workflows.find(w => w.id === id);
      const updatedWorkflows = workflows.filter(w => w.id !== id);
      
      // Add target workflow to trash with deletedAt timestamp
      let updatedTrash = trash;
      if (targetWf) {
        const trashedItem = {
          ...JSON.parse(JSON.stringify(targetWf)),
          deletedAt: Date.now()
        };
        updatedTrash = [trashedItem, ...trash];
      }

      // If ALL workflows have been deleted (0 workflows remaining)
      if (updatedWorkflows.length === 0) {
        set({
          workflows: [],
          activeWorkflowId: null,
          nodes: [],
          edges: [],
          nodeIDs: {},
          trash: updatedTrash,
          past: [],
          future: []
        });
        persistWorkflows([], null);
        persistTrash(updatedTrash);
        return;
      }

      let newActiveId = activeWorkflowId;
      if (id === activeWorkflowId) {
        newActiveId = updatedWorkflows[0].id;
        const target = updatedWorkflows[0];
        set({
          workflows: updatedWorkflows,
          activeWorkflowId: newActiveId,
          nodes: target.nodes || [],
          edges: target.edges || [],
          nodeIDs: target.nodeIDs || {},
          trash: updatedTrash,
          past: [],
          future: []
        });
      } else {
        set({ workflows: updatedWorkflows, trash: updatedTrash });
      }

      persistWorkflows(updatedWorkflows, newActiveId);
      persistTrash(updatedTrash);
    },

    // Restore a workflow from trash back to active sheet tabs
    restoreWorkflow: (id) => {
      const { trash, workflows } = get();
      const target = trash.find(t => t.id === id);
      if (!target) return;

      const updatedTrash = trash.filter(t => t.id !== id);
      const { deletedAt, deletedFromComputer, ...restoredWf } = target;

      // If the file was deleted from the computer/desktop, reset hasBeenFileSaved & fileHandle
      // so saving it again will automatically trigger the laptop File Picker dialog ("where to save")
      const wfToRestore = {
        ...restoredWf,
        hasBeenFileSaved: deletedFromComputer ? false : restoredWf.hasBeenFileSaved,
        fileHandle: deletedFromComputer ? null : restoredWf.fileHandle
      };

      // Filter out any blank initial default workflow (0 nodes, 0 edges, unsaved)
      const existingNonEmpty = workflows.filter(
        (w) => (w.nodes && w.nodes.length > 0) || (w.edges && w.edges.length > 0) || w.hasBeenFileSaved
      );

      const updatedWorkflows = [...existingNonEmpty, wfToRestore];
      set({
        workflows: updatedWorkflows,
        activeWorkflowId: wfToRestore.id,
        nodes: wfToRestore.nodes || [],
        edges: wfToRestore.edges || [],
        nodeIDs: wfToRestore.nodeIDs || {},
        trash: updatedTrash,
        past: [],
        future: []
      });

      persistWorkflows(updatedWorkflows, wfToRestore.id);
      persistTrash(updatedTrash);
    },

    // Permanently delete a workflow from trash
    permanentlyDeleteWorkflow: (id) => {
      deleteHandleFromIDB(id);
      const { trash } = get();
      const updatedTrash = trash.filter(t => t.id !== id);
      set({ trash: updatedTrash });
      persistTrash(updatedTrash);
    },

    // Empty entire trash
    emptyTrash: () => {
      set({ trash: [] });
      persistTrash([]);
    },

    // Rename a workflow tab
    renameWorkflow: (id, newName) => {
      const { workflows, activeWorkflowId } = get();
      const updatedWorkflows = workflows.map((wf) => {
        if (wf.id === id) {
          return { ...wf, name: newName || wf.name };
        }
        return wf;
      });
      set({ workflows: updatedWorkflows });
      persistWorkflows(updatedWorkflows, activeWorkflowId);
    },

    getNodeID: (type) => {
        const nodes = get().nodes || [];
        const nodesOfType = nodes.filter((n) => n.type === type || (n.id && n.id.startsWith(`${type}-`)));
        const usedNumbers = new Set(
          nodesOfType
            .map((n) => {
              const num = parseInt(n.id.split('-').pop(), 10);
              return isNaN(num) ? null : num;
            })
            .filter((n) => n !== null)
        );

        let counter = 1;
        while (usedNumbers.has(counter)) {
          counter++;
        }

        const newIDs = { ...get().nodeIDs, [type]: counter };
        set({ nodeIDs: newIDs });
        return `${type}-${counter}`;
    },

    pushHistory: () => {
      const state = get();
      const snapshot = cloneState(state);
      const newPast = [...state.past, snapshot].slice(-50);
      set({ past: newPast, future: [] });
    },

    addNode: (node) => {
        const { workflows } = get();
        if (!workflows || workflows.length === 0) {
          get().createWorkflow();
        }
        get().pushHistory();
        const existingNodes = get().nodes.map((n) => ({ ...n, selected: false }));
        const newNodes = [...existingNodes, { ...node, selected: false }];
        set({ nodes: newNodes });
        get().syncActiveWorkflow(newNodes, get().edges);
    },

    deleteNode: (nodeId) => {
      get().pushHistory();
      const newNodes = get().nodes.filter((node) => node.id !== nodeId);
      const newEdges = get().edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
      set({ nodes: newNodes, edges: newEdges });
      get().syncActiveWorkflow(newNodes, newEdges);
    },

    deleteEdge: (edgeId) => {
      get().pushHistory();
      const newEdges = get().edges.filter((edge) => edge.id !== edgeId);
      set({ edges: newEdges });
      get().syncActiveWorkflow(get().nodes, newEdges);
    },

    onNodesChange: (changes) => {
      const isDraggingActive = changes.some((c) => c.type === 'position' && c.dragging === true);
      const shouldRecord = changes.some(c => c.type === 'remove' || (c.type === 'position' && c.dragging === false));
      if (shouldRecord) {
        get().pushHistory();
      }
      const newNodes = applyNodeChanges(changes, get().nodes);
      set({ nodes: newNodes });

      if (!isDraggingActive) {
        get().syncActiveWorkflow(newNodes, get().edges);
      }
    },

    onEdgesChange: (changes) => {
      const shouldRecord = changes.some(c => c.type === 'remove');
      if (shouldRecord) {
        get().pushHistory();
      }
      const newEdges = applyEdgeChanges(changes, get().edges);
      set({ edges: newEdges });
      get().syncActiveWorkflow(get().nodes, newEdges);
    },

    onConnect: (connection) => {
      get().pushHistory();
      const newEdges = addEdge({...connection, type: 'default', animated: true, markerEnd: {type: MarkerType.Arrow, height: '20px', width: '20px'}}, get().edges);
      set({ edges: newEdges });
      get().syncActiveWorkflow(get().nodes, newEdges);
    },

    updateNodeField: (nodeId, fieldName, fieldValue) => {
      const newNodes = get().nodes.map((node) => {
        if (node.id === nodeId) {
          node.data = { ...node.data, [fieldName]: fieldValue };
        }
        return node;
      });
      set({ nodes: newNodes });
      get().syncActiveWorkflow(newNodes, get().edges);
    },

    undo: () => {
      const { past, future, nodes, edges } = get();
      if (past.length === 0) return;

      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);
      const currentSnapshot = cloneState({ nodes, edges });

      set({
        past: newPast,
        future: [currentSnapshot, ...future],
        nodes: previous.nodes,
        edges: previous.edges
      });
      get().syncActiveWorkflow(previous.nodes, previous.edges);
    },

    redo: () => {
      const { past, future, nodes, edges } = get();
      if (future.length === 0) return;

      const next = future[0];
      const newFuture = future.slice(1);
      const currentSnapshot = cloneState({ nodes, edges });

      set({
        past: [...past, currentSnapshot],
        future: newFuture,
        nodes: next.nodes,
        edges: next.edges
      });
      get().syncActiveWorkflow(next.nodes, next.edges);
    }
  }));
