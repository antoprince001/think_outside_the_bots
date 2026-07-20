import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkflowBuilder } from '../../components/workflow-builder';

function renderBuilder() {
  const store = { connections: [], workflows: [], sessions: [] };
  const persist = vi.fn((mutator) => mutator(store));
  const onSaved = vi.fn();
  render(<WorkflowBuilder persist={persist} onSaved={onSaved} />);
  return { store, persist, onSaved };
}

describe('WorkflowBuilder', () => {
  it('starts with a valid default configuration and no errors', () => {
    renderBuilder();
    expect(screen.getByRole('button', { name: /save workflow/i })).toBeEnabled();
  });

  it('shows a validation message and disables save when the minimum is out of range', () => {
    renderBuilder();
    fireEvent.change(screen.getByLabelText(/minimum draft characters/i), {
      target: { value: '20000' },
    });
    expect(screen.getByText(/minimum characters must be 1-10,000/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save workflow/i })).toBeDisabled();
  });

  it('shows a validation message when the name is cleared', () => {
    renderBuilder();
    fireEvent.change(screen.getByLabelText(/workflow name/i), { target: { value: '' } });
    expect(screen.getByText(/give the workflow a name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save workflow/i })).toBeDisabled();
  });

  it('saves a valid workflow and reports it back to the parent', () => {
    const { store, persist, onSaved } = renderBuilder();
    fireEvent.change(screen.getByLabelText(/workflow name/i), { target: { value: 'My Deep Dive' } });
    fireEvent.click(screen.getByRole('button', { name: /save workflow/i }));

    expect(persist).toHaveBeenCalled();
    expect(store.workflows).toHaveLength(1);
    expect(store.workflows[0].name).toBe('My Deep Dive');
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ name: 'My Deep Dive' }));
  });

  it('enforces exactly one learner-contribution gate before AI feedback in the saved sequence', () => {
    const { store } = renderBuilder();
    fireEvent.click(screen.getByRole('button', { name: /save workflow/i }));
    const [draftStep, feedbackStep] = store.workflows[0].steps;
    expect(draftStep).toEqual(expect.objectContaining({
      actor: 'learner',
      activity: 'write',
      output: 'draft',
    }));
    expect(feedbackStep).toEqual(expect.objectContaining({
      actor: 'ai',
      activity: 'feedback',
      skill: 'draft_feedback',
      output: 'feedback',
    }));
  });
});
