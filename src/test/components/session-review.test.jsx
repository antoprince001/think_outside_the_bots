import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionReview } from '../../components/session-review';
import { createSession } from '../../workflows/session-machine';
import { presets } from '../../workflows/presets';

const { mockDownloadTextFile } = vi.hoisted(() => ({
  mockDownloadTextFile: vi.fn(),
}));

vi.mock('../../utils/export-text', () => ({
  downloadTextFile: mockDownloadTextFile,
  safeFilename: (name, prefix) => `${prefix}-${name}`.replace(/\s+/g, '-'),
}));

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

  it('renders learning trail entries as collapsible details', () => {
    const session = createSession({ task: 'Explain recursion', workflow: feynman, connection: null });
    render(<SessionReview session={session} />);
    const questionSummary = screen.getByText('Question').closest('details');
    expect(questionSummary).not.toBeNull();
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

  it('exports the session review in chronological conversation order', () => {
    const session = createSession({ task: 'Explain recursion', workflow: feynman, connection: null });
    session.startedAt = '2024-01-01T00:00:01.000Z';
    session.contributions.push({
      id: '1',
      kind: 'explanation',
      body: 'My explanation text',
      createdAt: '2024-01-01T00:00:02.000Z',
    });
    session.feedbacks.push({
      id: 'f1',
      kind: 'feedback',
      content: 'AI feedback text',
      createdAt: '2024-01-01T00:00:03.000Z',
    });
    render(<SessionReview session={session} onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));

    expect(mockDownloadTextFile).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('- Question: Explain recursion\n- Your explanation: My explanation text\n- AI feedback: AI feedback text'),
      }),
    );
  });

  it('interleaves user and AI turns by timestamp when available', () => {
    const session = createSession({ task: 'Explain recursion', workflow: feynman, connection: null });
    session.startedAt = '2024-01-01T00:00:00.000Z';
    session.contributions.push(
      { id: 'c1', kind: 'explanation', body: 'First draft', createdAt: '2024-01-01T00:00:01.000Z' },
      { id: 'c2', kind: 'explanation', body: 'Second draft', createdAt: '2024-01-01T00:00:03.000Z' },
    );
    session.feedbacks.push({ id: 'f1', kind: 'feedback', content: 'First feedback', createdAt: '2024-01-01T00:00:02.000Z' });

    render(<SessionReview session={session} onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));

    expect(mockDownloadTextFile).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('- Question: Explain recursion\n- Your explanation: First draft\n- AI feedback: First feedback\n- Your explanation: Second draft'),
      }),
    );
  });
});
