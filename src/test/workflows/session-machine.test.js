import { describe, it, expect } from 'vitest';
import { presets } from '../../workflows/presets';
import { createSession, currentStep, submit, advance, remaining } from '../../workflows/session-machine';
import { withTimerDuration } from '../../workflows/workflow-model';

const feynman = presets.find((p) => p.id === 'feynman');
const freeze = presets.find((p) => p.id === 'freeze');

describe('session-machine', () => {
  it('starts a session at its first step', () => {
    const session = createSession({ task: 'Explain recursion', workflow: feynman, connection: null });
    expect(session.currentStepIndex).toBe(0);
    expect(currentStep(session).activity).toBe('write');
    expect(session.status).toBe('active');
  });

  it('blocks submission below the minimum character gate', () => {
    const session = createSession({ task: 'x', workflow: feynman, connection: null });
    const after = submit(session, 'too short');
    expect(after.currentStepIndex).toBe(0);
    expect(after.contributions).toHaveLength(0);
  });

  it('advances after a satisfying contribution and records it immutably', () => {
    const session = createSession({ task: 'x', workflow: feynman, connection: null });
    const explanation = 'a'.repeat(150);
    const after = submit(session, explanation);
    expect(after.currentStepIndex).toBe(1);
    expect(after.contributions[0].status).toBe('submitted');
    expect(after.contributions[0].body).toBe(explanation);
    expect(currentStep(after).activity).toBe('feedback');
  });

  it('completes once the final step is passed', () => {
    let session = createSession({ task: 'x', workflow: feynman, connection: null });
    session = submit(session, 'a'.repeat(150));
    session = advance(session); // past feedback
    session = advance(session); // past generate
    expect(session.status).toBe('complete');
    expect(session.completedAt).toBeTruthy();
  });

  it('calculates freeze time remaining from a persisted wall-clock start, not a live countdown', () => {
    let session = createSession({ task: 'x', workflow: freeze, connection: null });
    session = submit(session, 'first attempt');
    const step = currentStep(session);
    expect(step.activity).toBe('timer');
    const startedMs = new Date(session.freezeStartedAt).getTime();
    const secsLeft = remaining(step, session.freezeStartedAt, startedMs + 60_000);
    expect(secsLeft).toBe(120); // 180s duration - 60s elapsed, survives reload since it's wall-clock based
  });

  it('uses a custom freeze timer duration when the workflow is configured before session start', () => {
    const customFreeze = withTimerDuration(freeze, 600);
    let session = createSession({ task: 'x', workflow: customFreeze, connection: null });
    session = submit(session, 'first attempt');
    const step = currentStep(session);
    const startedMs = new Date(session.freezeStartedAt).getTime();
    expect(remaining(step, session.freezeStartedAt, startedMs + 60_000)).toBe(540);
  });
});
