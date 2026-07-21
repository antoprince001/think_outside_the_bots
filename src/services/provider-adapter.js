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

function parseAdaptiveSequence(responseText, workflowIds = []) {
  const rawText = String(responseText ?? '').trim();
  if (!rawText) return workflowIds;

  try {
    const parsed = JSON.parse(rawText);
    if (Array.isArray(parsed)) {
      return parsed
        .map((value) => String(value ?? '').trim())
        .filter(Boolean)
        .filter((value) => workflowIds.includes(value) || workflowIds.some((workflowId) => workflowId.toLowerCase() === value.toLowerCase()));
    }
  } catch {
    // Fall through to a looser parse below.
  }

  const arrayMatch = rawText.match(/\[(.*?)\]/s);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed
          .map((value) => String(value ?? '').trim())
          .filter(Boolean)
          .filter((value) => workflowIds.includes(value) || workflowIds.some((workflowId) => workflowId.toLowerCase() === value.toLowerCase()));
      }
    } catch {
      // Ignore and fall back to the original order.
    }
  }

  return workflowIds;
}

export async function suggestAdaptiveWorkflowSequence({ connection, key, task, selectionPrompt = '', workflowIds = [], workflows = [] }) {
  const normalizedWorkflowIds = (workflowIds ?? []).filter(Boolean);
  if (!key?.trim() || normalizedWorkflowIds.length <= 1) {
    return normalizedWorkflowIds;
  }

  const availableMethods = (workflows ?? [])
    .filter((workflow) => normalizedWorkflowIds.includes(workflow.id))
    .map((workflow) => `- ${workflow.id}: ${workflow.name}${workflow.description ? ` — ${workflow.description}` : ''}`)
    .join('\n');

  const providerId = providerIdFor(connection);
  try {
    const prompt = [
      'You are choosing the order of learning methods for a learner.',
      `Learner task: ${task}`,
      `Adaptive guidance: ${selectionPrompt || 'Choose the most sensible order for the learner.'}`,
      'Available methods:',
      availableMethods,
      'Return only a JSON array of method IDs in the recommended order. Example: ["socratic","feynman"]',
    ].join('\n\n');

    let result;
    if (providerId === 'openai') {
      const openai = createOpenAI({ apiKey: key });
      result = await generateText({
        model: openai(`${connection.model}`),
        system: 'Choose a sensible sequence for the learner. Return only JSON.',
        prompt,
        maxOutputTokens: 300,
        maxRetries: 1,
      });
    } else if (providerId === 'google') {
      const google = createGoogle({ apiKey: key });
      result = await generateText({
        model: google(`${connection.model}`),
        system: 'Choose a sensible sequence for the learner. Return only JSON.',
        prompt,
        maxOutputTokens: 300,
        maxRetries: 1,
      });
    } else {
      return normalizedWorkflowIds;
    }

    const orderedIds = parseAdaptiveSequence(result?.text, normalizedWorkflowIds);
    return orderedIds.length > 0 ? orderedIds : normalizedWorkflowIds;
  } catch {
    return normalizedWorkflowIds;
  }
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

    const maxOutputTokens = step?.activity === 'generate' ? 2000 : 500;

    if (providerId === 'openai') {
      const openai = createOpenAI({ apiKey: key });
      result = await generateText({
        model: openai(`${connection.model}`),
        system: systemInstruction,
        prompt,
        maxOutputTokens,
        maxRetries: 1,
      });
    } else if (providerId === 'google') {
      const google = createGoogle({ apiKey: key });
      result = await generateText({
        model: google(`${connection.model}`),
        system: systemInstruction,
        prompt,
        maxOutputTokens,
        maxRetries: 1,
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
