import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionReview } from '../../components/session-review';
import { createSession } from '../../workflows/session-machine';
import { presets } from '../../workflows/presets';

const feynman = presets.find((p) => p.id === 'feynman');

describe('SessionReview', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:review');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the ordered event timeline', () => {
    const session = createSession({ task: 'Explain recursion', workflow: feynman, connection: null });
    render(<SessionReview session={session} />);
    expect(screen.getByText('Session started')).toBeInTheDocument();
  });

  it('shows submitted contributions', () => {
    const session = createSession({ task: 'x', workflow: feynman, connection: null });
    session.contributions.push({ id: '1', kind: 'explanation', body: 'My explanation text' });
    render(<SessionReview session={session} />);
    expect(screen.getByText('My explanation text')).toBeInTheDocument();
  });

  it('shows saved AI feedback in the learning trail', () => {
    const session = createSession({ task: 'x', workflow: feynman, connection: null });
    session.feedbacks.push({
      id: 'f1',
      kind: 'feedback',
      content: 'AI feedback text',
      createdAt: new Date().toISOString(),
    });
    render(<SessionReview session={session} />);
    expect(screen.getByLabelText('Learning trail')).toHaveTextContent('AI feedback text');
  });

  it('shows whether the session is complete or still in progress', () => {
    const session = createSession({ task: 'x', workflow: feynman, connection: null });
    render(<SessionReview session={{ ...session, status: 'complete' }} />);
    expect(screen.getByText(/complete/i)).toBeInTheDocument();
  });

  it('exits the review when the exit button is clicked', () => {
    const onExit = vi.fn();
    const session = createSession({ task: 'x', workflow: feynman, connection: null });
    render(<SessionReview session={session} onExit={onExit} />);
    fireEvent.click(screen.getByRole('button', { name: /exit/i }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('exports the session review as a text file', () => {
    const session = createSession({ task: 'Explain recursion', workflow: feynman, connection: null });
    session.contributions.push({ id: '1', kind: 'explanation', body: 'My explanation text' });
    render(<SessionReview session={session} onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:review');
  });
});
