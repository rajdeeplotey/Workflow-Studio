import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ExecutionResultModal } from './ExecutionResultModal';

describe('ExecutionResultModal', () => {
  const onClose = jest.fn();

  test('renders actual input, math output, and output node from the backend response', () => {
    render(
      <ExecutionResultModal
        isOpen
        onClose={onClose}
        result={{
          success: true,
          topological_order: ['input-1', 'math-1', 'output-1'],
          node_execution_logs: {
            'input-1': { name: 'Input', type: 'customInput', status: 'success', inputs_received: {}, output: { a: 20, b: 15 }, execution_time_ms: 1 },
            'math-1': { name: 'Math', type: 'math', status: 'success', inputs_received: { input: 20 }, output: 35, execution_time_ms: 2 },
            'output-1': { name: 'Output', type: 'customOutput', status: 'success', inputs_received: { value: 35 }, output: 35, execution_time_ms: 1 }
          },
          terminal_outputs: { result: 35 }
        }}
      />
    );

    expect(screen.getByText('Executed 3 nodes in topological order')).toBeInTheDocument();
    expect(screen.getByText('Input (customInput)')).toBeInTheDocument();
    expect(screen.getByText('Math (math)')).toBeInTheDocument();
    expect(screen.getByText('Output (customOutput)')).toBeInTheDocument();
    expect(screen.getAllByText('35')).toHaveLength(3);
  });

  test('shows failures and skipped branch details even when overall execution failed', () => {
    render(
      <ExecutionResultModal
        isOpen
        onClose={onClose}
        result={{
          success: false,
          topological_order: ['condition-1', 'llm-1', 'database-1'],
          node_execution_logs: {
            'condition-1': { name: 'Condition', type: 'filter', status: 'success', output: { passed: true }, execution_time_ms: 1 },
            'llm-1': { name: 'Gemini', type: 'llm', status: 'error', error: 'Gemini request failed', output: 'Error: Gemini request failed' },
            'database-1': { name: 'Database', type: 'database', status: 'skipped', output: null }
          }
        }}
      />
    );

    expect(screen.getByText('Result: TRUE')).toBeInTheDocument();
    expect(screen.getByText('Gemini request failed')).toBeInTheDocument();
    expect(screen.getByText(/SKIPPED/)).toBeInTheDocument();
    expect(screen.getByText('Reason: Skipped by workflow routing.')).toBeInTheDocument();
  });

  test('shows an empty-state message when no node details are returned', () => {
    render(<ExecutionResultModal isOpen onClose={onClose} result={{ success: true }} />);
    expect(screen.getByText('No execution details returned.')).toBeInTheDocument();
  });
});