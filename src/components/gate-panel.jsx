import { Timer } from 'lucide-react';
import { remaining } from '../workflows/session-machine';
import { minCharactersFor } from '../workflows/workflow-model';

function formatCountdown(secondsLeft) {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, '0');
  return `${minutes}:${seconds} remaining`;
}

function actionLabel({ step, isLocked, secondsLeft, isAiLoading, isReask = false }) {
  if (isAiLoading) return 'Getting feedback...';
  if (isLocked) return formatCountdown(secondsLeft);
  if (step?.activity === 'feedback') {
    if (isReask) {
      return step?.skill === 'socratic_question' ? 'Ask another question' : 'Explain again';
    }
    return 'Get feedback';
  }
  if (step?.activity === 'generate') return 'Unlock worked explanation';
  if (step?.activity === 'display') return 'Continue';
  return 'Submit my thinking';
}

/**
 * Renders the current workflow step: a drafting textarea for contribution
 * and freeze steps, a text (non-color) countdown while frozen, any
 * received AI feedback, and the single primary action for this step.
 *
 * Freeze time is derived from `session.freezeStartedAt` (a persisted
 * wall-clock timestamp) rather than a live in-memory countdown, so a
 * reload cannot shorten the enforced wait — see workflows/session-machine.js.
 */
export function GatePanel({ session, step, draft, onDraftChange, feedback, now, onAction, isAiLoading = false }) {
  const isTimerStep = step?.activity === 'timer';
  const secondsLeft = isTimerStep
    ? remaining(step, session.freezeStartedAt || session.startedAt, now)
    : 0;
  const minimumCharacters = minCharactersFor(step);
  const isLocked = isTimerStep && secondsLeft > 0;
  const showsDraftArea = step?.activity === 'write' || isTimerStep;
  const displayMessage = step?.configuration?.message;
  const reaskCount = Number(session?.reaskCounts?.[step?.id] ?? 0);
  const reaskHint = reaskCount > 0 ? 'Try again with a fresh angle.' : null;
  const charactersRemaining = minimumCharacters
    ? Math.max(0, minimumCharacters - draft.trim().length)
    : null;
  const isBelowMinimum = step?.activity === 'write' && draft.trim().length < minimumCharacters;

  return (
    <>
      {isTimerStep && (
        <p className="timer" role="status">
          <Timer size={18} />
          {formatCountdown(secondsLeft)} — {displayMessage || 'keep drafting; AI stays paused.'}
        </p>
      )}

      {step?.activity === 'display' && (
        <article className="feedback system-message">
          <b>{step.instruction || 'Note'}</b>
          <p>{displayMessage}</p>
        </article>
      )}

      {showsDraftArea && (
        <>
          <textarea
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder="Write what you think…"
            maxLength={10000}
          />
          <p className="hint">
            {charactersRemaining !== null
              ? `${charactersRemaining} characters until feedback can unlock.`
              : 'Your draft is saved locally.'}
          </p>
        </>
      )}

      {feedback && (
        <article className="feedback">
          <b>{reaskHint ? 'Try again' : 'AI feedback'}</b>
          <p>{feedback}</p>
        </article>
      )}

      {step?.activity === 'feedback' && reaskHint && (
        <p className="hint">{reaskHint}</p>
      )}

      {session.status === 'recoverable_error' && (
        <p className="error">Your work is safe. Retry or choose another model.</p>
      )}

      {isAiLoading && (
        <p className="ai-loading" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          Asking the model for feedback...
        </p>
      )}

      <button
        type="button"
        className="primary"
        disabled={isBelowMinimum || isLocked || isAiLoading}
        onClick={onAction}
        aria-busy={isAiLoading}
      >
        {isAiLoading && <span className="spinner button-spinner" aria-hidden="true" />}
        {actionLabel({ step, isLocked, secondsLeft, isAiLoading, isReask: reaskCount > 0 })}
      </button>
    </>
  );
}
