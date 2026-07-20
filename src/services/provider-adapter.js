export const PROVIDERS = [{ id: 'openai', label: 'OpenAI', models: ['gpt-4.1-mini', 'gpt-4.1'] }];
export async function testConnection(_connection, key) { if (!key?.trim()) return { status: 'invalid' }; return { status: 'valid' }; }
export async function requestFeedback({ connection, key, task, workflow, contributions }) {
  if (!key) throw new Error('Model key is unavailable.');
  const text = contributions.at(-1)?.body || '';
  const instruction = workflow.id === 'socratic' ? 'Ask one concise Socratic follow-up question. Do not provide a direct solution.' : workflow.id === 'feynman' ? 'Give concise gap feedback on the student explanation. Do not provide the final solution.' : 'Give concise feedback on the student draft. Do not provide a direct solution unless explicitly asked after the workflow completes.';
  const response = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: connection.model, messages: [{ role: 'system', content: instruction }, { role: 'user', content: `Task: ${task}\nStudent work: ${text}` }], max_tokens: 300 }) });
  if (!response.ok) throw new Error('Provider request failed.');
  const content = (await response.json()).choices?.[0]?.message?.content;
  if (!content) throw new Error('Provider returned no feedback.');
  return { kind: workflow.id === 'socratic' ? 'question' : 'feedback', content };
}
