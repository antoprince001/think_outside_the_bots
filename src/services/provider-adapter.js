// Browser-origin provider adapter. Only allow-listed providers that permit
// direct browser requests are exposed here. Requests are sent straight from
// the student's browser to the provider — never through an application
// backend — and failures are mapped to generic, key-free messages.

import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogle } from '@ai-sdk/google';

export const PROVIDERS = [
  { id: 'openai', label: 'OpenAI', models: ['gpt-5.4-mini', 'gpt-5.4'] },
  { id: 'google', label: 'Google Gemini', models: ['gemini-2.5-flash'] },
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

function providerIdFor(connection) {
  if (connection?.provider) return connection.provider;
  return PROVIDERS.find((provider) => provider.models.includes(connection?.model))?.id;
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
  const providerId = providerIdFor(connection);
  console.log('Inside requestFeedback')
  try {
    let result;
    if (providerId === 'openai') {
      const openai = createOpenAI({ apiKey: key });
      result = await generateText({
        model: openai(connection.model),
        system: instruction,
        prompt: `Task: ${task}\nStudent work: ${latestContribution}`,
        maxOutputTokens: 300,
      });
    } else if (providerId === 'google') {
        console.log('Inside google requestFeedback')

      const google = createGoogle({ apiKey: key });
      // result = await generateText({
      //   model: google(connection.model),
      //   system: instruction,
      //   prompt: `Task: ${task}\nStudent work: ${latestContribution}`,
      //   maxOutputTokens: 300,
      // });
      result = await generateText({
        model: google('gemini-2.5-flash'),
        prompt: 'Write a vegetarian lasagna recipe for 4 people.',
      });
    } else {
      console.log('Unsuported provider')
      throw new Error('Unsupported provider.');
    }

    const content = result.text?.trim();
    if (!content) {
      throw new Error('Provider returned no feedback.');
    }

    return { kind: workflow.id === 'socratic' ? 'question' : 'feedback', content };
  } catch {
    throw new Error('Provider request failed.');
  }
}
