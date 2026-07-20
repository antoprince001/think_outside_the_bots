// Browser-origin provider adapter. Only allow-listed providers that permit
// direct browser requests are exposed here. Requests are sent straight from
// the student's browser to the provider — never through an application
// backend — and failures are mapped to generic, key-free messages.

export const PROVIDERS = [
  { id: 'openai', label: 'OpenAI', models: ['gpt-4.1-mini', 'gpt-4.1'] },
];

const FEEDBACK_INSTRUCTIONS = {
  socratic: 'Ask one concise Socratic follow-up question. Do not provide a direct solution.',
  feynman: 'Give concise gap feedback on the student explanation. Do not provide the final solution.',
  default:
    'Give concise feedback on the student draft. Do not provide a direct solution unless ' +
    'explicitly asked after the workflow completes.',
};

function instructionFor(workflowId) {
  return FEEDBACK_INSTRUCTIONS[workflowId] ?? FEEDBACK_INSTRUCTIONS.default;
}

export async function testConnection(_connection, key) {
  if (!key?.trim()) {
    return { status: 'invalid' };
  }
  return { status: 'valid' };
}

export async function requestFeedback({ connection, key, task, workflow, contributions }) {
  if (!key) {
    throw new Error('Model key is unavailable.');
  }

  const latestContribution = contributions.at(-1)?.body ?? '';
  const instruction = instructionFor(workflow.id);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: connection.model,
      messages: [
        { role: 'system', content: instruction },
        { role: 'user', content: `Task: ${task}\nStudent work: ${latestContribution}` },
      ],
      max_tokens: 300,
    }),
  });

  if (!response.ok) {
    throw new Error('Provider request failed.');
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Provider returned no feedback.');
  }

  return { kind: workflow.id === 'socratic' ? 'question' : 'feedback', content };
}
