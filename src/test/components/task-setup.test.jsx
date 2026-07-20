import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskSetup } from '../../components/task-setup';
import { presets } from '../../workflows/presets';

function renderSetup(overrides = {}) {
  const props = {
    task: '',
    onTaskChange: vi.fn(),
    workflows: presets,
    selectedWorkflowId: presets[0].id,
    onSelectWorkflow: vi.fn(),
    hasReadyConnection: false,
    onStart: vi.fn(),
    ...overrides,
  };
  render(<TaskSetup {...props} />);
  return props;
}

describe('TaskSetup', () => {
  it('renders every workflow as a selectable option', () => {
    renderSetup();
    presets.forEach((preset) => {
      expect(screen.getByText(preset.name)).toBeInTheDocument();
    });
  });

  it('disables start when there is no task', () => {
    renderSetup({ task: '', hasReadyConnection: true });
    expect(screen.getByRole('button', { name: /start learning/i })).toBeDisabled();
  });

  it('disables start when there is no ready model connection', () => {
    renderSetup({ task: 'Explain recursion', hasReadyConnection: false });
    expect(screen.getByRole('button', { name: /start learning/i })).toBeDisabled();
    expect(screen.getByText(/add and test a model connection/i)).toBeInTheDocument();
  });

  it('enables start once a task and a ready connection are both present', () => {
    renderSetup({ task: 'Explain recursion', hasReadyConnection: true });
    expect(screen.getByRole('button', { name: /start learning/i })).toBeEnabled();
  });

  it('calls onStart when the start button is clicked', () => {
    const props = renderSetup({ task: 'Explain recursion', hasReadyConnection: true });
    fireEvent.click(screen.getByRole('button', { name: /start learning/i }));
    expect(props.onStart).toHaveBeenCalledTimes(1);
  });

  it('selects a workflow when its card is clicked', () => {
    const props = renderSetup();
    fireEvent.click(screen.getByText(presets[1].name));
    expect(props.onSelectWorkflow).toHaveBeenCalledWith(presets[1].id);
  });
});
