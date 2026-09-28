// textNode.test.js
import React from 'react';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TextNode } from './textNode';
import { useStore } from '../store';

// Mock reactflow hooks & components
jest.mock('reactflow', () => ({
  ...jest.requireActual('reactflow'),
  Handle: ({ id, position, type, style }) => (
    <div
      data-testid={`handle-${id}`}
      data-handle-id={id}
      data-handle-position={position}
      data-handle-type={type}
      style={style}
    />
  ),
  Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
  useUpdateNodeInternals: () => jest.fn(),
}));

describe('TextNode - Handle creation and dynamic edge cleanup', () => {
  beforeEach(() => {
    act(() => {
      useStore.setState({
        nodes: [
          { id: 'text-1', type: 'text', position: { x: 0, y: 0 }, data: { id: 'text-1', text: '' } },
          { id: 'node-1', type: 'customInput', position: { x: 0, y: 0 }, data: { id: 'node-1' } },
          { id: 'node-2', type: 'customInput', position: { x: 0, y: 0 }, data: { id: 'node-2' } },
          { id: 'node-3', type: 'customInput', position: { x: 0, y: 0 }, data: { id: 'node-3' } },
        ],
        edges: [],
        activeWorkflowId: 'wf-1',
        workflows: [{ id: 'wf-1', name: 'Test Workflow', nodes: [], edges: [], nodeIDs: {} }]
      });
    });
  });

  test('Step 1 & 2: Renders 3 separate handles on left edge for {{name}} {{age}} {{city}}', () => {
    const { getByTestId } = render(
      <TextNode id="text-1" data={{ id: 'text-1', text: '{{name}} {{age}} {{city}}' }} />
    );

    // Confirm 3 separate handles exist on left edge
    expect(getByTestId('handle-var-name')).toBeInTheDocument();
    expect(getByTestId('handle-var-age')).toBeInTheDocument();
    expect(getByTestId('handle-var-city')).toBeInTheDocument();

    // Confirm output handle exists on right edge
    expect(getByTestId('handle-text-1-output')).toBeInTheDocument();
  });

  test('Step 3 & 4: Supports 3 separate edges targeting name, age, city simultaneously', () => {
    render(<TextNode id="text-1" data={{ id: 'text-1', text: '{{name}} {{age}} {{city}}' }} />);

    // Add 3 separate connections from other nodes into name, age, city handles
    const edges = [
      { id: 'e-1', source: 'node-1', sourceHandle: 'node-1-value', target: 'text-1', targetHandle: 'var-name' },
      { id: 'e-2', source: 'node-2', sourceHandle: 'node-2-value', target: 'text-1', targetHandle: 'var-age' },
      { id: 'e-3', source: 'node-3', sourceHandle: 'node-3-value', target: 'text-1', targetHandle: 'var-city' },
    ];

    act(() => {
      useStore.setState({ edges });
    });

    expect(useStore.getState().edges).toHaveLength(3);
    expect(useStore.getState().edges.map((e) => e.targetHandle)).toEqual(['var-name', 'var-age', 'var-city']);
  });

  test('Step 5 & 6: Deleting {{age}} removes age handle & age edge while leaving name & city handles/edges intact', () => {
    const { rerender, queryByTestId, getByTestId } = render(
      <TextNode id="text-1" data={{ id: 'text-1', text: '{{name}} {{age}} {{city}}' }} />
    );

    const initialEdges = [
      { id: 'e-1', source: 'node-1', sourceHandle: 'node-1-value', target: 'text-1', targetHandle: 'var-name' },
      { id: 'e-2', source: 'node-2', sourceHandle: 'node-2-value', target: 'text-1', targetHandle: 'var-age' },
      { id: 'e-3', source: 'node-3', sourceHandle: 'node-3-value', target: 'text-1', targetHandle: 'var-city' },
    ];
    act(() => {
      useStore.setState({ edges: initialEdges });
    });

    // Delete {{age}} by updating prop / text to {{name}} {{city}}
    act(() => {
      rerender(<TextNode id="text-1" data={{ id: 'text-1', text: '{{name}} {{city}}' }} />);
    });

    // Confirm age handle disappears while name and city handles remain
    expect(getByTestId('handle-var-name')).toBeInTheDocument();
    expect(queryByTestId('handle-var-age')).not.toBeInTheDocument();
    expect(getByTestId('handle-var-city')).toBeInTheDocument();

    // Confirm age edge (e-2) was removed while name (e-1) and city (e-3) edges remain
    const remainingEdges = useStore.getState().edges;
    expect(remainingEdges).toHaveLength(2);
    expect(remainingEdges.map((e) => e.id)).toEqual(['e-1', 'e-3']);
    expect(remainingEdges.map((e) => e.targetHandle)).toEqual(['var-name', 'var-city']);
  });

  test('Step 8: Re-verifies invalid variable names are rejected (e.g. {{123abc}}, {{my var}})', () => {
    const { queryByTestId } = render(
      <TextNode id="text-1" data={{ id: 'text-1', text: '{{123abc}} {{my var}} {{}}' }} />
    );

    expect(queryByTestId('handle-var-123abc')).not.toBeInTheDocument();
    expect(queryByTestId('handle-var-my var')).not.toBeInTheDocument();
    expect(queryByTestId('handle-var-my')).not.toBeInTheDocument();
  });
});
