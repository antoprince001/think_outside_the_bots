import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SessionReview } from '../../components/session-review';
import { createSession } from '../../workflows/session-machine';
import { presets } from '../../workflows/presets';

const feynman = presets.find((p) => p.id === 'feynman');

describe('SessionReview', () => {
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

  it('shows whether the session is complete or still in progress', () => {
    const session = createSession({ task: 'x', workflow: feynman, connection: null });
    render(<SessionReview session={{ ...session, status: 'complete' }} />);
    expect(screen.getByText(/complete/i)).toBeInTheDocument();
  });
});
