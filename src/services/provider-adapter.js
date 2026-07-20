export const PROVIDERS = [{ id: 'openai', label: 'OpenAI', models: ['gpt-4.1-mini', 'gpt-4.1'] }];
export async function testConnection(_connection, key) { if (!key?.trim()) return { status: 'invalid' }; return { status: 'valid' }; }
export async function requestFeedback({ workflow, contributions }) {
  const text = contributions.at(-1)?.body || '';
  if (workflow.id === 'socratic') return { kind: 'question', content: `What evidence in your own response supports “${text.slice(0, 80)}”?` };
  if (workflow.id === 'feynman') return { kind: 'feedback', content: 'Good start. Explain the key idea with one concrete example and name any assumption you used.' };
  return { kind: 'feedback', content: 'Compare your draft with the task. What is the strongest step, and what would you revise first?' };
}
