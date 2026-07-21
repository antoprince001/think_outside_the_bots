import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { getKey } from '../services/credential-store';
import { requestFeedback } from '../services/provider-adapter';
import { advance, currentStep, remaining, submit } from '../workflows/session-machine';
import { resolveStepInputs } from '../workflows/workflow-model';
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
  const [isAiLoading, setIsAiLoading] = useState(false);

  const step = currentStep(session);
  const isTimerStep = step?.activity === 'timer';
  const freezeSecondsLeft = isTimerStep
    ? remaining(step, session.freezeStartedAt || session.startedAt, now)
    : 0;

  async function requestAiActivity() {
    if (isAiLoading) return;
    // The session snapshot is the source of truth for the selected model. The
    // live connection can be absent after a local-store refresh or deletion,
    // but it still contains everything the adapter needs to construct a model.
    const connection = connections.find((c) => c.id === session.modelSnapshot?.id)
      ?? session.modelSnapshot;
    const connectionId = session.modelSnapshot?.id ?? connection?.id;
    setIsAiLoading(true);
    try {
      const result = await requestFeedback({
        connection,
        key: getKey(connectionId),
        task: session.task,
        workflow: session.workflowSnapshot,
        step,
        inputs: resolveStepInputs(step, session),
        contributions: session.contributions,
        feedbacks: session.feedbacks,
        reaskCount: session.reaskCounts?.[step?.id] ?? 0,
      });
      const feedbackRecord = {
        id: uid(),
        kind: result.kind,
        content: result.content,
        stepId: step.id,
        output: step.output,
        createdAt: new Date().toISOString(),
      };
      onSessionChange(advance({
        ...session,
        feedbacks: [...(session.feedbacks ?? []), feedbackRecord],
        variables: { ...(session.variables ?? {}), ...(step.output ? { [step.output]: result.content } : {}) },
      }));
    } catch {
      onSessionChange({ ...session, status: 'recoverable_error' });
    } finally {
      setIsAiLoading(false);
    }
  }

  function revealFinalAnswer() {
    const feedbackRecord = {
      id: uid(),
      kind: 'final_answer',
      content: FINAL_ANSWER_MESSAGE,
      stepId: step.id,
      output: step.output,
      createdAt: new Date().toISOString(),
    };
    onSessionChange({
      ...advance({
        ...session,
        feedbacks: [...(session.feedbacks ?? []), feedbackRecord],
        variables: { ...(session.variables ?? {}), ...(step.output ? { [step.output]: FINAL_ANSWER_MESSAGE } : {}) },
      }),
      status: 'complete',
    });
  }

  function handleAction() {
    if (isTimerStep) {
      if (freezeSecondsLeft > 0) return;
      onSessionChange(advance(session));
      return;
    }
    if (step?.activity === 'write') {
      onSessionChange(submit(session, draft));
      return;
    }
    if (step?.activity === 'display') {
      onSessionChange(advance(session));
      return;
    }
    if (step?.activity === 'feedback') {
      requestAiActivity();
      return;
    }
    if (step?.activity === 'generate') {
      if (step.actor === 'ai' && step.skill) {
        requestAiActivity();
      } else {
        revealFinalAnswer();
      }
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
      <h1>{step?.instruction || 'You built a path.'}</h1>

      <SessionTrail session={session} />

      <GatePanel
        session={session}
        step={step}
        draft={draft}
        onDraftChange={setDraft}
        feedback=""
        now={now}
        onAction={handleAction}
        isAiLoading={isAiLoading}
      />
    </section>
  );
}
