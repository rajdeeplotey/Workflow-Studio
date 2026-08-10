// nodeNumbering.test.js
import { useStore } from './store';

describe('Sequential node ID numbering per palette type', () => {
  beforeEach(() => {
    useStore.setState({
      nodes: [],
      edges: [],
      nodeIDs: {},
      activeWorkflowId: 'wf-1',
      workflows: [{ id: 'wf-1', name: 'Test Workflow', nodes: [], edges: [], nodeIDs: {} }]
    });
  });

  test('Resets numbering to 1 when all nodes of a type are deleted', () => {
    const store = useStore.getState();

    // Add 3 LLM nodes
    const llm1 = { id: store.getNodeID('llm'), type: 'llm', position: { x: 0, y: 0 }, data: {} };
    store.addNode(llm1);
    expect(llm1.id).toBe('llm-1');

    const llm2 = { id: useStore.getState().getNodeID('llm'), type: 'llm', position: { x: 0, y: 0 }, data: {} };
    useStore.getState().addNode(llm2);
    expect(llm2.id).toBe('llm-2');

    const llm3 = { id: useStore.getState().getNodeID('llm'), type: 'llm', position: { x: 0, y: 0 }, data: {} };
    useStore.getState().addNode(llm3);
    expect(llm3.id).toBe('llm-3');

    expect(useStore.getState().nodes).toHaveLength(3);

    // Delete all 3 LLM cards (simulate crossing out all cards)
    useStore.getState().deleteNode('llm-1');
    useStore.getState().deleteNode('llm-2');
    useStore.getState().deleteNode('llm-3');

    expect(useStore.getState().nodes).toHaveLength(0);

    // Drag a new single LLM node -> should be llm-1 instead of llm-4
    const newLlm = { id: useStore.getState().getNodeID('llm'), type: 'llm', position: { x: 0, y: 0 }, data: {} };
    useStore.getState().addNode(newLlm);

    expect(newLlm.id).toBe('llm-1');
  });

  test('Fills lowest available gap when middle node is deleted', () => {
    const store = useStore.getState();

    store.addNode({ id: store.getNodeID('text'), type: 'text', position: { x: 0, y: 0 }, data: {} }); // text-1
    store.addNode({ id: useStore.getState().getNodeID('text'), type: 'text', position: { x: 0, y: 0 }, data: {} }); // text-2
    store.addNode({ id: useStore.getState().getNodeID('text'), type: 'text', position: { x: 0, y: 0 }, data: {} }); // text-3

    // Delete text-2
    useStore.getState().deleteNode('text-2');

    // Next created node should be text-2
    const nextText = { id: useStore.getState().getNodeID('text'), type: 'text', position: { x: 0, y: 0 }, data: {} };
    expect(nextText.id).toBe('text-2');
  });

  test('Works independently across all palette node types', () => {
    const paletteTypes = ['customInput', 'customOutput', 'llm', 'text', 'math', 'filter', 'timer', 'api', 'database'];

    paletteTypes.forEach((type) => {
      const id1 = useStore.getState().getNodeID(type);
      expect(id1).toBe(`${type}-1`);
      useStore.getState().addNode({ id: id1, type, position: { x: 0, y: 0 }, data: {} });

      const id2 = useStore.getState().getNodeID(type);
      expect(id2).toBe(`${type}-2`);
      useStore.getState().addNode({ id: id2, type, position: { x: 0, y: 0 }, data: {} });

      // Delete both
      useStore.getState().deleteNode(id1);
      useStore.getState().deleteNode(id2);

      // Re-create -> should be type-1
      const resetId = useStore.getState().getNodeID(type);
      expect(resetId).toBe(`${type}-1`);
    });
  });
});
