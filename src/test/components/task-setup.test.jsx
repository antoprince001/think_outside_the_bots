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
    selectedWorkflow: presets[0],
    onSelectWorkflow: vi.fn(),
    freezeDurationSeconds: 180,
    onFreezeDurationChange: vi.fn(),
    fileInput: null,
    onFileInputChange: vi.fn(),
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

  it('shows AI freeze duration choices only for the freeze workflow', () => {
    const freeze = presets.find((preset) => preset.id === 'freeze');
    renderSetup({ selectedWorkflowId: freeze.id, selectedWorkflow: freeze });
    expect(screen.getByRole('radiogroup', { name: /ai freeze duration/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /3 min/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('updates the selected freeze duration', () => {
    const freeze = presets.find((preset) => preset.id === 'freeze');
    const props = renderSetup({ selectedWorkflowId: freeze.id, selectedWorkflow: freeze });
    fireEvent.click(screen.getByRole('radio', { name: /10 min/i }));
    expect(props.onFreezeDurationChange).toHaveBeenCalledWith(600);
  });
});
