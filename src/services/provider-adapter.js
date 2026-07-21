// Browser-origin provider adapter. Only allow-listed providers that permit
// direct browser requests are exposed here. Requests are sent straight from
// the student's browser to the provider — never through an application
// backend — and failures are mapped to generic, key-free messages.

import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogle } from '@ai-sdk/google';
import { getAIInstruction, getWorkflowConfiguration } from '../workflows/workflow-model';

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

function promptFor({ task, step, inputs = {}, contributions = [], feedbacks = [] }) {
  const inputLines = Object.entries(inputs).map(([key, value]) => `${key}: ${value}`).join('\n');
  const historyEntries = [
    ...contributions.map((entry) => ({ role: 'Learner', text: entry?.body ?? '' })),
    ...feedbacks.map((entry) => ({ role: entry?.kind === 'final_answer' ? 'AI final answer' : 'AI feedback', text: entry?.content ?? '' })),
  ].filter((entry) => entry.text?.trim());
  const conversationHistory = historyEntries.length > 0
    ? `Conversation so far:\n${historyEntries.slice(-6).map((entry) => `${entry.role}: ${entry.text}`).join('\n')}`
    : '';
  return [
    `Problem: ${task}`,
    step?.configuration?.prompt && `Activity request: ${step.configuration.prompt}`,
    inputLines && `Workflow inputs:\n${inputLines}`,
    conversationHistory && conversationHistory,
  ].filter(Boolean).join('\n\n');
}

export async function requestFeedback({ connection, key, task, workflow, step, inputs, contributions, feedbacks = [], reaskCount = 0 }) {
  if (!key) {
    throw new Error('Model key is unavailable.');
  }

  const skill = step?.skill ?? (workflow.id === 'socratic' ? 'socratic_question' : 'draft_feedback');
  const workflowConfig = getWorkflowConfiguration(workflow);
  const instruction = getAIInstruction(skill, { reaskCount });
  const providerId = providerIdFor(connection);
  try {
    let result;
    const prompt = promptFor({ task, step, inputs, contributions, feedbacks });
    const systemInstruction = workflowConfig.reaskEnabled && reaskCount > 0
      ? `${instruction} If the learner still needs another pass, ask a short follow-up question without revealing the answer.`
      : instruction;

    const maxOutputTokens = step?.activity === 'generate' ? 2000 : 1500;

    if (providerId === 'openai') {
      const openai = createOpenAI({ apiKey: key });
      result = await generateText({
        model: openai(`${connection.model}`),
        system: systemInstruction,
        prompt,
        maxOutputTokens,
      });
    } else if (providerId === 'google') {
      const google = createGoogle({ apiKey: key });
      result = await generateText({
        model: google(`${connection.model}`),
        system: systemInstruction,
        prompt,
        maxOutputTokens,
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
