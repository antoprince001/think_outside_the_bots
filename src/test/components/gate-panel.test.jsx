import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GatePanel } from '../../components/gate-panel';
import { presets } from '../../workflows/presets';

const freeze = presets.find((p) => p.id === 'freeze');
const longDraft = presets.find((p) => p.id === 'long-draft');

function baseSession(workflow, overrides = {}) {
  return {
    id: 's1',
    status: 'active',
    workflowSnapshot: workflow,
    startedAt: new Date('2026-07-20T10:00:00Z').toISOString(),
    freezeStartedAt: new Date('2026-07-20T10:00:00Z').toISOString(),
    ...overrides,
  };
}

describe('GatePanel', () => {
  it('renders freeze time as visible text, not color alone', () => {
    const step = freeze.steps.find((s) => s.activity === 'timer');
    const session = baseSession(freeze);
    const now = new Date('2026-07-20T10:01:00Z').getTime();
    render(
      <GatePanel session={session} step={step} draft="" onDraftChange={vi.fn()} feedback="" now={now} onAction={vi.fn()} />
    );
    expect(screen.getByRole('status')).toHaveTextContent('2:00 remaining');
  });

  it('locks the action button while freeze time remains', () => {
    const step = freeze.steps.find((s) => s.activity === 'timer');
    const session = baseSession(freeze);
    const now = new Date('2026-07-20T10:00:30Z').getTime();
    render(
      <GatePanel session={session} step={step} draft="" onDraftChange={vi.fn()} feedback="" now={now} onAction={vi.fn()} />
    );
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('unlocks the action button once the freeze duration has fully elapsed', () => {
    const step = freeze.steps.find((s) => s.activity === 'timer');
    const session = baseSession(freeze);
    const now = new Date('2026-07-20T10:03:01Z').getTime(); // 181s > 180s duration
    render(
      <GatePanel session={session} step={step} draft="" onDraftChange={vi.fn()} feedback="" now={now} onAction={vi.fn()} />
    );
    expect(screen.getByRole('button')).toBeEnabled();
  });

  it('derives remaining time from the persisted freeze start, so a later "now" never resets it', () => {
    const step = freeze.steps.find((s) => s.activity === 'timer');
    const session = baseSession(freeze); // freezeStartedAt fixed regardless of when the component re-renders
    const laterNow = new Date('2026-07-20T10:02:00Z').getTime();
    render(
      <GatePanel session={session} step={step} draft="" onDraftChange={vi.fn()} feedback="" now={laterNow} onAction={vi.fn()} />
    );
    expect(screen.getByRole('status')).toHaveTextContent('1:00 remaining');
  });

  it('shows the remaining character count for the long-draft threshold', () => {
    const step = longDraft.steps.find((s) => s.activity === 'write');
    const session = baseSession(longDraft);
    render(
      <GatePanel
        session={session}
        step={step}
        draft={'a'.repeat(100)}
        onDraftChange={vi.fn()}
        feedback=""
        now={Date.now()}
        onAction={vi.fn()}
      />
    );
    expect(screen.getByText('50 characters until feedback can unlock.')).toBeInTheDocument();
  });

  it('keeps the action disabled below the long-draft minimum and enables it once met', () => {
    const step = longDraft.steps.find((s) => s.activity === 'write');
    const session = baseSession(longDraft);
    const { rerender } = render(
      <GatePanel
        session={session}
        step={step}
        draft={'a'.repeat(100)}
        onDraftChange={vi.fn()}
        feedback=""
        now={Date.now()}
        onAction={vi.fn()}
      />
    );
    expect(screen.getByRole('button')).toBeDisabled();

    rerender(
      <GatePanel
        session={session}
        step={step}
        draft={'a'.repeat(step.validation.minCharacters)}
        onDraftChange={vi.fn()}
        feedback=""
        now={Date.now()}
        onAction={vi.fn()}
      />
    );
    expect(screen.getByRole('button')).toBeEnabled();
  });
});
