const EVENT_LABELS = {
  session_created: 'Session started',
  gate_open: 'Gate opened',
  draft_save: 'Draft saved',
  submission: 'Contribution submitted',
  freeze_start: 'Freeze window started',
  freeze_complete: 'Freeze window complete',
  ai_request: 'Requested AI feedback',
  ai_success: 'AI feedback received',
  ai_failure: 'AI feedback failed',
  final_answer_reveal: 'Final answer revealed',
  completion: 'Session complete',
};

function labelFor(event) {
  return EVENT_LABELS[event.type] ?? event.type;
}

/**
 * Renders the chronological, safe-to-display event timeline for a
 * completed or in-progress session. Events never carry API keys or raw
 * provider payloads — see workflows/session-machine.js.
 */
export function SessionReview({ session }) {
  return (
    <section className="session">
      <span className="eyebrow">
        {session.workflowSnapshot.name} · {session.status === 'complete' ? 'Complete' : 'In progress'}
      </span>
      <h1>Session review</h1>
      <p>{session.task}</p>

      <ol className="timeline">
        {session.events.map((event) => (
          <li key={event.id}>
            <b>{labelFor(event)}</b>{' '}
            <time dateTime={event.at}>{new Date(event.at).toLocaleString()}</time>
          </li>
        ))}
      </ol>

      {session.contributions.map((contribution) => (
        <article key={contribution.id} className="feedback">
          <b>Your {contribution.kind}</b>
          <p>{contribution.body}</p>
        </article>
      ))}
    </section>
  );
}
