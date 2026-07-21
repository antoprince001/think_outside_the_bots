import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    fireEvent.change(screen.getByLabelText(/minimum characters/i), {
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
    const [, draftStep, feedbackStep] = store.workflows[0].steps;
    expect(draftStep).toEqual(expect.objectContaining({
      actor: 'learner',
      activity: 'write',
      output: 'response2',
    }));
    expect(feedbackStep).toEqual(expect.objectContaining({
      actor: 'ai',
      activity: 'feedback',
      skill: 'draft_feedback',
      output: 'feedback3',
    }));
  });

  it('lets the user add a timer node to the visual graph', () => {
    const { store } = renderBuilder();
    fireEvent.click(screen.getByRole('button', { name: /timer/i }));
    fireEvent.click(screen.getByRole('button', { name: /save workflow/i }));
    expect(store.workflows[0].steps.some((step) => step.activity === 'timer')).toBe(true);
  });

  it('stores custom AI prompt text in the feedback node configuration', () => {
    const { store } = renderBuilder();
    fireEvent.change(screen.getAllByLabelText(/what to ask ai/i)[0], {
      target: { value: 'Ask a Socratic question about the weakest assumption.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save workflow/i }));
    const feedbackStep = store.workflows[0].steps.find((step) => step.activity === 'feedback');
    expect(feedbackStep.configuration.prompt).toBe('Ask a Socratic question about the weakest assumption.');
  });

  it('imports a workflow markdown file into the builder editor', async () => {
    renderBuilder();

    class MockFileReader {
      constructor() {
        this.onload = null;
      }

      readAsText() {
        const content = `# Workflow export

\`\`\`yaml
version: "1.0.0"
id: imported-workflow
name: Imported workflow
kind: custom
description: Imported workflow
inputs:
  - problem
variables: {}
steps:
  - id: node-1
    actor: system
    activity: display
    instruction: Intro
    configuration:
      message: Welcome
  - id: node-2
    actor: learner
    activity: write
    instruction: Respond
    validation:
      minCharacters: 160
    output: response2
outputs:
  answer: "{{vars.response2}}"
\`\`\``;
        this.result = content;
        this.onload?.({ target: { result: content } });
      }
    }

    vi.stubGlobal('FileReader', MockFileReader);

    fireEvent.change(screen.getByLabelText(/import workflow/i), {
      target: { files: [new File(['content'], 'workflow.md', { type: 'text/markdown' })] },
    });

    await waitFor(() => expect(screen.getByLabelText(/workflow name/i)).toHaveValue('Imported workflow'));
    expect(screen.getByDisplayValue('Intro')).toBeInTheDocument();

    vi.unstubAllGlobals();
  });
});
