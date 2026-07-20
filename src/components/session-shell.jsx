import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { getKey } from '../services/credential-store';
import { requestFeedback } from '../services/provider-adapter';
import { advance, currentStep, remaining, submit } from '../workflows/session-machine';
import { uid } from '../utils/uid';
import { GatePanel } from './gate-panel';
import { SessionTrail } from './session-trail';

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

  const step = currentStep(session);
  const isFrozenStep = step?.type === 'freeze';
  const freezeSecondsLeft = isFrozenStep
    ? remaining(step, session.freezeStartedAt || session.startedAt, now)
    : 0;

  async function requestAiFeedback() {
    // The session snapshot is the source of truth for the selected model. The
    // live connection can be absent after a local-store refresh or deletion,
    // but it still contains everything the adapter needs to construct a model.
    const connection = connections.find((c) => c.id === session.modelSnapshot?.id)
      ?? session.modelSnapshot;
    const connectionId = session.modelSnapshot?.id ?? connection?.id;
    try {
      const result = await requestFeedback({
        connection,
        key: getKey(connectionId),
        task: session.task,
        workflow: session.workflowSnapshot,
        contributions: session.contributions,
      });
      const feedbackRecord = {
        id: uid(),
        kind: result.kind,
        content: result.content,
        createdAt: new Date().toISOString(),
      };
      onSessionChange(advance({
        ...session,
        feedbacks: [...(session.feedbacks ?? []), feedbackRecord],
      }));
    } catch {
      onSessionChange({ ...session, status: 'recoverable_error' });
    }
  }

  function revealFinalAnswer() {
    const feedbackRecord = {
      id: uid(),
      kind: 'final_answer',
      content: FINAL_ANSWER_MESSAGE,
      createdAt: new Date().toISOString(),
    };
    onSessionChange({
      ...advance({
        ...session,
        feedbacks: [...(session.feedbacks ?? []), feedbackRecord],
      }),
      status: 'complete',
    });
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
      <div className="session-header">
        <span className="eyebrow">
          {session.workflowSnapshot.name} · Step {stepNumber} of {totalSteps}
        </span>
        <button type="button" className="secondary" onClick={onExit}>
          <LogOut size={16} /> Exit
        </button>
      </div>
      <h1>{step?.prompt || 'You built a path.'}</h1>

      <SessionTrail session={session} />

      <GatePanel
        session={session}
        step={step}
        draft={draft}
        onDraftChange={setDraft}
        feedback=""
        now={now}
        onAction={handleAction}
      />
    </section>
  );
}
