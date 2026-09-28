// workflowSavingAndRecovery.test.js
import { useStore } from './store';

describe('Workflow Casing Preservation & Recovery Auto-Backup Behavior', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useStore.setState({
      nodes: [],
      edges: [],
      nodeIDs: {},
      activeWorkflowId: 'wf-1',
      workflows: [{ id: 'wf-1', name: 'Untitled 1', nodes: [], edges: [], nodeIDs: {}, hasBeenFileSaved: false }]
    });
  });

  test('Preserves UPPERCASE and mixed-case workflow names when renaming', () => {
    const { renameWorkflow } = useStore.getState();
    renameWorkflow('wf-1', 'MY_CAPITAL_WORKFLOW');

    const updatedWf = useStore.getState().workflows.find(w => w.id === 'wf-1');
    expect(updatedWf.name).toBe('MY_CAPITAL_WORKFLOW');

    const savedWorkflows = JSON.parse(localStorage.getItem('vectorshift_workflows'));
    expect(savedWorkflows[0].name).toBe('MY_CAPITAL_WORKFLOW');
  });

  test('Does not save auto-backup snapshot when workflow is file saved', () => {
    const { addNode, markWorkflowFileSaved } = useStore.getState();
    addNode({ id: 'llm-1', type: 'llm', position: { x: 0, y: 0 }, data: {} });

    // When unsaved node exists, auto backup exists
    expect(localStorage.getItem('vectorshift_auto_backup')).not.toBeNull();

    // Mark as file saved
    markWorkflowFileSaved('wf-1');

    // Auto backup MUST be removed since 0 unsaved workflows remain
    expect(localStorage.getItem('vectorshift_auto_backup')).toBeNull();
  });

  test('Purges expired auto-backup older than 4 hours window', () => {
    const FIVE_HOURS_AGO = Date.now() - (5 * 60 * 60 * 1000);
    const expiredSnapshot = {
      timestamp: FIVE_HOURS_AGO,
      workflows: [{ id: 'wf-1', name: 'Old Unsaved Work', nodes: [{ id: '1' }], edges: [], hasBeenFileSaved: false }]
    };

    localStorage.setItem('vectorshift_auto_backup', JSON.stringify(expiredSnapshot));
    expect(localStorage.getItem('vectorshift_auto_backup')).not.toBeNull();

    // Re-triggering persistWorkflows or state load should purge old backup
    useStore.getState().syncActiveWorkflow([], []);
    expect(localStorage.getItem('vectorshift_auto_backup')).toBeNull();
  });

  test('Moves workflow to Studio Trash when computer file getFile throws an error', async () => {
    const mockMissingHandle = {
      getFile: jest.fn().mockRejectedValue(new Error('File not found on computer disk'))
    };

    useStore.setState({
      workflows: [{
        id: 'wf-saved-1',
        name: 'My Saved Workflow',
        nodes: [{ id: '1' }],
        edges: [],
        hasBeenFileSaved: true,
        fileHandle: mockMissingHandle
      }],
      trash: [],
      activeWorkflowId: 'wf-saved-1'
    });

    await useStore.getState().verifyLaptopFiles();

    const { workflows, trash } = useStore.getState();
    expect(workflows).toHaveLength(0);
    expect(trash).toHaveLength(1);
    expect(trash[0].name).toBe('My Saved Workflow');
    expect(trash[0].deletedFromComputer).toBe(true);
  });
});
