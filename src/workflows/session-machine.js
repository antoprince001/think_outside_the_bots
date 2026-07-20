import { uid } from '../utils/uid';
import { durationSecondsFor, minCharactersFor, normalizeWorkflow } from './workflow-model';

export function createSession({ task, workflow, connection }) {
  const now = new Date().toISOString();
  const workflowSnapshot = normalizeWorkflow(structuredClone(workflow));
  return {
    id: uid(),
    task,
    taskSnapshot: { id: uid(), prompt: task, createdAt: now, updatedAt: now },
    workflowSnapshot,
    modelSnapshot: connection
      ? { id: connection.id, label: connection.label, provider: connection.provider, model: connection.model }
      : null,
    status: 'active',
    currentStepIndex: 0,
    contributions: [],
    feedbacks: [],
    inputs: { problem: task },
    variables: { ...(workflowSnapshot.variables ?? {}) },
    events: [{ id: uid(), type: 'session_created', at: now }],
    startedAt: now,
    freezeStartedAt: null,
  };
}

export function currentStep(session) {
  if (!session) return null;
  return session.workflowSnapshot.steps[session.currentStepIndex] || null;
}

export function remaining(step, freezeStartedAt, now) {
  if (!step || step.activity !== 'timer') return 0;
  const startedMs = new Date(freezeStartedAt).getTime();
  const elapsed = Math.floor((now - startedMs) / 1000);
  return Math.max(0, durationSecondsFor(step) - elapsed);
}

function withEvent(session, type, extra = {}) {
  return {
    ...session,
    events: [...session.events, { id: uid(), type, at: new Date().toISOString(), ...extra }],
  };
}

export function submit(session, body) {
  const step = currentStep(session);
  if (!step || step.activity !== 'write') return session;
  const trimmed = (body || '').trim();
  if (trimmed.length < minCharactersFor(step)) return session;
  const contribution = {
    id: uid(),
    sessionId: session.id,
    stepId: step.id,
    kind: step.output || 'draft',
    body: trimmed,
    status: 'submitted',
    createdAt: new Date().toISOString(),
  };
  let next = {
    ...session,
    contributions: [...session.contributions, contribution],
    variables: { ...(session.variables ?? {}), [step.output || 'draft']: trimmed },
  };
  next = withEvent(next, 'submission', { stepId: step.id });
  return advance(next);
}

export function advance(session) {
  const step = currentStep(session);
  const nextIndex = session.currentStepIndex + 1;
  const nextStep = session.workflowSnapshot.steps[nextIndex];
  let next = { ...session, currentStepIndex: nextIndex };

  if (step?.activity === 'feedback') next.status = 'active';
  if (nextStep?.activity === 'timer') {
    next.freezeStartedAt = new Date().toISOString();
    next = withEvent(next, 'freeze_start');
  }
  if (!nextStep) {
    next.status = 'complete';
    next.completedAt = new Date().toISOString();
    next = withEvent(next, 'completion');
  }
  return next;
}
