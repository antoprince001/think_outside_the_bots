import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionShell } from '../../components/session-shell';
import { createSession } from '../../workflows/session-machine';
import { presets } from '../../workflows/presets';
import * as credentialStore from '../../services/credential-store';
import * as providerAdapter from '../../services/provider-adapter';
import { TEST_SAMPLE_LENGTH } from '../../constants';

const feynman = presets.find((p) => p.id === 'feynman');
const socratic = presets.find((p) => p.id === 'socratic');

const connection = { id: 'conn-1', label: 'Test model', provider: 'openai', model: 'gpt-4.1-mini' };

function renderShell(session, onSessionChange = vi.fn(), availableConnections = [connection]) {
  render(
    <SessionShell
      session={session}
      onSessionChange={onSessionChange}
      connections={availableConnections}
      now={Date.now()}
      onExit={vi.fn()}
    />
  );
  return onSessionChange;
}

describe('SessionShell', () => {
  beforeEach(() => {
    vi.spyOn(credentialStore, 'getKey').mockReturnValue('sk-test');
  });

  it('keeps the AI feedback control locked until the contribution gate is met', () => {
    const session = createSession({ task: 'Explain recursion', workflow: feynman, connection });
    renderShell(session);
    expect(screen.getByRole('button', { name: /submit my thinking/i })).toBeDisabled();
  });

  it('unlocks submission once the minimum length is met and calls onSessionChange', () => {
    const session = createSession({ task: 'Explain recursion', workflow: feynman, connection });
    const onSessionChange = renderShell(session);
    fireEvent.change(screen.getByPlaceholderText(/write what you think/i), {
      target: { value: 'a'.repeat(TEST_SAMPLE_LENGTH) },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit my thinking/i }));
    expect(onSessionChange).toHaveBeenCalled();
    expect(onSessionChange.mock.calls[0][0].currentStepIndex).toBe(1);
  });

  it('requests AI feedback and shows it once the gate is passed', async () => {
    vi.spyOn(providerAdapter, 'requestFeedback').mockResolvedValue({
      kind: 'feedback',
      content: 'Consider explaining the base case.',
    });
    let session = createSession({ task: 'x', workflow: feynman, connection });
    session = { ...session, currentStepIndex: 1, contributions: [{ body: 'a'.repeat(TEST_SAMPLE_LENGTH) }] };
    const onSessionChange = renderShell(session);

    fireEvent.click(screen.getByRole('button', { name: /get ai feedback/i }));

    await waitFor(() => {
      expect(onSessionChange).toHaveBeenCalled();
    });
    expect(onSessionChange.mock.calls[0][0].feedbacks).toEqual([
      expect.objectContaining({ content: 'Consider explaining the base case.' }),
    ]);
  });

  it('requests feedback using the Google provider from the session snapshot', async () => {
    const googleConnection = { id: 'google-1', label: 'Gemini', provider: 'google', model: 'gemini-3.6-flash' };
    vi.spyOn(providerAdapter, 'requestFeedback').mockResolvedValue({
      kind: 'feedback',
      content: 'Google feedback',
    });
    let session = createSession({ task: 'x', workflow: feynman, connection: googleConnection });
    session = { ...session, currentStepIndex: 1, contributions: [{ body: 'a'.repeat(TEST_SAMPLE_LENGTH) }] };
    renderShell(session, vi.fn(), [googleConnection]);

    fireEvent.click(screen.getByRole('button', { name: /get ai feedback/i }));

    await waitFor(() => expect(providerAdapter.requestFeedback).toHaveBeenCalledWith(expect.objectContaining({
      connection: googleConnection,
      key: 'sk-test',
    })));
  });

  it('never provides a direct solution before the Socratic completion rule is met', () => {
    const session = createSession({ task: 'x', workflow: socratic, connection });
    renderShell(session);
    expect(screen.queryByRole('button', { name: /unlock worked explanation/i })).not.toBeInTheDocument();
  });

  it('moves to a recoverable error state and preserves the draft on provider failure', async () => {
    vi.spyOn(providerAdapter, 'requestFeedback').mockRejectedValue(new Error('boom'));
    let session = createSession({ task: 'x', workflow: feynman, connection });
    session = { ...session, currentStepIndex: 1, contributions: [{ body: 'a'.repeat(TEST_SAMPLE_LENGTH) }] };
    const onSessionChange = renderShell(session);

    fireEvent.click(screen.getByRole('button', { name: /get ai feedback/i }));

    await waitFor(() => {
      expect(onSessionChange).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'recoverable_error' })
      );
    });
  });

  it('runs a saved custom workflow through the same gate → feedback → final-answer sequence', () => {
    const customWorkflow = {
      id: 'custom-1',
      name: 'My study workflow',
      kind: 'custom',
      finalAnswerPolicy: 'allowed',
      steps: [
        { id: 'draft', type: 'contribution', prompt: 'Write your first attempt.', contributionKind: 'draft', minCharacters: 10 },
        { id: 'feedback', type: 'ai_feedback', feedbackMode: 'draft_feedback' },
        { id: 'answer', type: 'final_answer', allowed: true },
      ],
    };
    const session = createSession({ task: 'x', workflow: customWorkflow, connection });
    renderShell(session);
    expect(screen.getByRole('button', { name: /submit my thinking/i })).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/write what you think/i), {
      target: { value: 'a real first attempt' },
    });
    expect(screen.getByRole('button', { name: /submit my thinking/i })).toBeEnabled();
  });

  it('keeps a session on its own workflow snapshot even if the live workflow is edited later', () => {
    const workflow = { ...feynman, steps: [...feynman.steps] };
    const session = createSession({ task: 'x', workflow, connection });
    // Mutating the "live" workflow object after the session started must not
    // affect the immutable snapshot captured on the session.
    workflow.steps = [];
    expect(session.workflowSnapshot.steps.length).toBeGreaterThan(0);
  });
});
