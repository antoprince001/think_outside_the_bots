import { useState } from 'react';
import { getKey } from '../services/credential-store';
import { requestFeedback } from '../services/provider-adapter';
import { advance, currentStep, remaining, submit } from '../workflows/session-machine';
import { GatePanel } from './gate-panel';

const FINAL_ANSWER_MESSAGE =
  'A worked explanation is now available because you built your own path first. Compare it to ' +
  'your reasoning and note one improvement.';

/**
 * Drives a single active learning session: shows the current gate, submits
 * contributions, requests AI feedback from the selected provider, and
 * reveals the final answer only once the workflow permits it. On a
 * provider failure the session moves to `recoverable_error` while the
 * task and latest draft stay exactly as the student left them.
 */
export function SessionShell({ session, onSessionChange, connections, now, onExit }) {
  const [draft, setDraft] = useState('');
  const [feedback, setFeedback] = useState('');

  const step = currentStep(session);
  const isFrozenStep = step?.type === 'freeze';
  const freezeSecondsLeft = isFrozenStep
    ? remaining(step, session.freezeStartedAt || session.startedAt, now)
    : 0;

  async function requestAiFeedback() {
    const connection = connections.find((c) => c.id === session.modelSnapshot?.id);
    try {
      const result = await requestFeedback({
        connection,
        key: getKey(connection?.id),
        task: session.task,
        workflow: session.workflowSnapshot,
        contributions: session.contributions,
      });
      setFeedback(result.content);
      onSessionChange(advance(session));
    } catch {
      onSessionChange({ ...session, status: 'recoverable_error' });
    }
  }

  function revealFinalAnswer() {
    setFeedback(FINAL_ANSWER_MESSAGE);
    onSessionChange({ ...advance(session), status: 'complete' });
  }

  function handleAction() {
    if (isFrozenStep) {
      if (freezeSecondsLeft > 0) return;
      onSessionChange(advance(session));
      return;
    }
    if (step?.type === 'contribution') {
      onSessionChange(submit(session, draft));
      return;
    }
    if (step?.type === 'ai_feedback') {
      requestAiFeedback();
      return;
    }
    if (step?.type === 'final_answer') {
      revealFinalAnswer();
    }
  }

  const totalSteps = session.workflowSnapshot.steps.length;
  const stepNumber = Math.min(session.currentStepIndex + 1, totalSteps);

  return (
    <section className="session">
      <button type="button" className="link" onClick={onExit}>
        Exit — work is saved
      </button>
      <span className="eyebrow">
        {session.workflowSnapshot.name} · Step {stepNumber} of {totalSteps}
      </span>
      <h1>{step?.prompt || 'You built a path.'}</h1>

      <GatePanel
        session={session}
        step={step}
        draft={draft}
        onDraftChange={setDraft}
        feedback={feedback}
        now={now}
        onAction={handleAction}
      />
    </section>
  );
}
