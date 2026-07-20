// Browser-origin provider adapter. Only allow-listed providers that permit
// direct browser requests are exposed here. Requests are sent straight from
// the student's browser to the provider — never through an application
// backend — and failures are mapped to generic, key-free messages.

import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogle } from '@ai-sdk/google';
import { AI_SKILLS } from '../workflows/workflow-model';

export const PROVIDERS = [
  { id: 'openai', label: 'OpenAI', models: ['gpt-5.4-mini', 'gpt-5.4'] },
  { id: 'google', label: 'Google Gemini', models: ['gemini-2.5-flash'] },
];

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

function promptFor({ task, inputs = {}, contributions = [] }) {
  const inputLines = Object.entries(inputs).map(([key, value]) => `${key}: ${value}`).join('\n');
  const latestContribution = contributions.at(-1)?.body ?? '';
  return [
    `Problem: ${task}`,
    inputLines && `Workflow inputs:\n${inputLines}`,
    latestContribution && `Latest learner work: ${latestContribution}`,
  ].filter(Boolean).join('\n\n');
}

export async function requestFeedback({ connection, key, task, workflow, step, inputs, contributions }) {
  if (!key) {
    throw new Error('Model key is unavailable.');
  }

  const skill = step?.skill ?? (workflow.id === 'socratic' ? 'socratic_question' : 'draft_feedback');
  const instruction = AI_SKILLS[skill] ?? AI_SKILLS.draft_feedback;
  const providerId = providerIdFor(connection);
  try {
    let result;
    if (providerId === 'openai') {
      const openai = createOpenAI({ apiKey: key });
      result = await generateText({
        model: openai(connection.model),
        system: instruction,
        prompt: promptFor({ task, inputs, contributions }),
        maxOutputTokens: 300,
      });
    } else if (providerId === 'google') {
      const google = createGoogle({ apiKey: key });
      result = await generateText({
        model: google('gemini-2.5-flash'),
        system: instruction,
        prompt: promptFor({ task, inputs, contributions }),
        maxOutputTokens: 300,
      });
    } else {
      throw new Error('Unsupported provider.');
    }

    const content = result.text?.trim();
    if (!content) {
      throw new Error('Provider returned no feedback.');
    }

    return { kind: step?.activity === 'generate' ? 'final_answer' : 'feedback', content };
  } catch {
    throw new Error('Provider request failed.');
  }
}
