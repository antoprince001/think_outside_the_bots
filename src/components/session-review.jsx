import { LogOut } from 'lucide-react';
import { SessionTrail } from './session-trail';

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
export function SessionReview({ session, onExit }) {
  return (
    <section className="session">
      <div className="session-header">
        <span className="eyebrow">
          {session.workflowSnapshot.name} · {session.status === 'complete' ? 'Complete' : 'In progress'}
        </span>
        <button type="button" className="secondary" onClick={onExit}>
          <LogOut size={16} /> Exit
        </button>
      </div>
      <h1>Session review</h1>

      <SessionTrail session={session} />

      <ol className="timeline">
        {session.events.map((event) => (
          <li key={event.id}>
            <b>{labelFor(event)}</b>{' '}
            <time dateTime={event.at}>{new Date(event.at).toLocaleString()}</time>
          </li>
        ))}
      </ol>

    </section>
  );
}
