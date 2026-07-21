function timeValue(item) {
  const rawTime = item.createdAt ?? item.at ?? item.timestamp ?? 0;
  if (!rawTime) return Number.MAX_SAFE_INTEGER;
  const parsed = new Date(rawTime).getTime();
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function buildConversationSequence(session, contributionItems, feedbackItems) {
  const mixedItems = [...contributionItems, ...feedbackItems];
  const hasTimestampData = mixedItems.some((item) => item.createdAt && !Number.isNaN(new Date(item.createdAt).getTime()));

  if (hasTimestampData) {
    return [...mixedItems].sort((a, b) => timeValue(a) - timeValue(b));
  }

  const orderedItems = [];
  const remainingContributions = [...contributionItems];
  const remainingFeedbacks = [...feedbackItems];

  for (const event of session.events ?? []) {
    if (event?.type === 'submission' && remainingContributions.length > 0) {
      orderedItems.push(remainingContributions.shift());
      continue;
    }

    if (['ai_request', 'ai_success', 'ai_failure', 'final_answer_reveal'].includes(event?.type) && remainingFeedbacks.length > 0) {
      orderedItems.push(remainingFeedbacks.shift());
    }
  }

  return [...orderedItems, ...remainingContributions, ...remainingFeedbacks];
}

export function trailItems(session, liveFeedback = '') {
  const taskItem = {
    id: 'task',
    type: 'task',
    label: 'Question',
    body: session.task,
    createdAt: session.startedAt,
  };

  const contributionItems = (session.contributions ?? []).map((contribution, index) => ({
    id: contribution.id ?? `contribution-${index}`,
    type: 'contribution',
    label: `Your ${contribution.kind ?? 'work'}`,
    body: contribution.body,
    createdAt: contribution.createdAt ?? session.startedAt,
  }));

  const feedbackItems = (session.feedbacks ?? []).map((feedback, index) => ({
    id: feedback.id ?? `feedback-${index}`,
    type: feedback.kind,
    label: feedback.kind === 'final_answer' ? 'Worked explanation' : 'AI feedback',
    body: feedback.content,
    createdAt: feedback.createdAt ?? session.startedAt,
  }));

  const orderedItems = buildConversationSequence(session, contributionItems, feedbackItems);
  const hasConversationEvents = (session.events ?? []).some((event) => event?.type === 'submission' || ['ai_request', 'ai_success', 'ai_failure', 'final_answer_reveal'].includes(event?.type));
  const items = [taskItem, ...orderedItems];

  if (liveFeedback && !(session.feedbacks ?? []).some((feedback) => feedback.content === liveFeedback)) {
    items.push({
      id: 'live-feedback',
      type: 'feedback',
      label: 'AI feedback',
      body: liveFeedback,
      createdAt: new Date().toISOString(),
    });
  }

  return hasConversationEvents ? items : items.sort((a, b) => timeValue(a) - timeValue(b));
}

export function SessionTrail({ session, liveFeedback = '' }) {
  const items = trailItems(session, liveFeedback);

  return (
    <section className="session-trail" aria-label="Learning trail">
      <h2>Learning trail</h2>
      <ol>
        {items.map((item) => (
          <li key={item.id} className={`trail-item ${item.type}`}>
            <details className="trail-details" open>
              <summary className="trail-summary">
                <span className="trail-label">{item.label}</span>
                <span className="trail-meta">{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Added'}</span>
              </summary>
              <div className="trail-body">
                <p>{item.body}</p>
              </div>
            </details>
          </li>
        ))}
      </ol>
    </section>
  );
}
