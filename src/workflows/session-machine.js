import { uid } from '../utils/uid';

export function createSession({ task, workflow, connection }) {
  const now = new Date().toISOString();
  return {
    id: uid(),
    task,
    taskSnapshot: { id: uid(), prompt: task, createdAt: now, updatedAt: now },
    workflowSnapshot: structuredClone(workflow),
    modelSnapshot: connection
      ? { id: connection.id, label: connection.label, provider: connection.provider, model: connection.model }
      : null,
    status: 'active',
    currentStepIndex: 0,
    contributions: [],
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
  if (!step || step.type !== 'freeze') return 0;
  const startedMs = new Date(freezeStartedAt).getTime();
  const elapsed = Math.floor((now - startedMs) / 1000);
  return Math.max(0, step.durationSeconds - elapsed);
}

function withEvent(session, type, extra = {}) {
  return {
    ...session,
    events: [...session.events, { id: uid(), type, at: new Date().toISOString(), ...extra }],
  };
}

export function submit(session, body) {
  const step = currentStep(session);
  if (!step || step.type !== 'contribution') return session;
  const trimmed = (body || '').trim();
  if (trimmed.length < step.minCharacters) return session;
  const contribution = {
    id: uid(),
    sessionId: session.id,
    stepId: step.id,
    kind: step.contributionKind || 'draft',
    body: trimmed,
    status: 'submitted',
    createdAt: new Date().toISOString(),
  };
  let next = {
    ...session,
    contributions: [...session.contributions, contribution],
  };
  next = withEvent(next, 'submission', { stepId: step.id });
  return advance(next);
}

export function advance(session) {
  const step = currentStep(session);
  const nextIndex = session.currentStepIndex + 1;
  const nextStep = session.workflowSnapshot.steps[nextIndex];
  let next = { ...session, currentStepIndex: nextIndex };

  if (step?.type === 'ai_feedback') next.status = 'active';
  if (nextStep?.type === 'freeze') {
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
