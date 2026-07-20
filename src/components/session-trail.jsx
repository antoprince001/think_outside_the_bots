function timeValue(item) {
  return new Date(item.createdAt ?? item.at ?? 0).getTime();
}

function trailItems(session, liveFeedback) {
  const items = [
    {
      id: 'task',
      type: 'task',
      label: 'Question',
      body: session.task,
      createdAt: session.startedAt,
    },
    ...(session.contributions ?? []).map((contribution, index) => ({
      id: contribution.id ?? `contribution-${index}`,
      type: 'contribution',
      label: `Your ${contribution.kind ?? 'work'}`,
      body: contribution.body,
      createdAt: contribution.createdAt ?? session.startedAt,
    })),
    ...(session.feedbacks ?? []).map((feedback, index) => ({
      id: feedback.id ?? `feedback-${index}`,
      type: feedback.kind,
      label: feedback.kind === 'final_answer' ? 'Worked explanation' : 'AI feedback',
      body: feedback.content,
      createdAt: feedback.createdAt ?? session.startedAt,
    })),
  ];

  if (liveFeedback && !(session.feedbacks ?? []).some((feedback) => feedback.content === liveFeedback)) {
    items.push({
      id: 'live-feedback',
      type: 'feedback',
      label: 'AI feedback',
      body: liveFeedback,
      createdAt: new Date().toISOString(),
    });
  }

  return items.sort((a, b) => timeValue(a) - timeValue(b));
}

export function SessionTrail({ session, liveFeedback = '' }) {
  return (
    <section className="session-trail" aria-label="Learning trail">
      <h2>Learning trail</h2>
      <ol>
        {trailItems(session, liveFeedback).map((item) => (
          <li key={item.id} className={`trail-item ${item.type}`}>
            <span>{item.label}</span>
            <p>{item.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
