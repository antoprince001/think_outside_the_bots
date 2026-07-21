import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { generateText, createOpenAI, createGoogle } = vi.hoisted(() => ({
  generateText: vi.fn(),
  createOpenAI: vi.fn((options) => (model) => ({ ...options, model })),
  createGoogle: vi.fn((options) => (model) => ({ ...options, model })),
}));

vi.mock('ai', () => ({ generateText }));
vi.mock('@ai-sdk/openai', () => ({ createOpenAI }));
vi.mock('@ai-sdk/google', () => ({ createGoogle }));

import { testConnection, requestFeedback, suggestAdaptiveWorkflowSequence, PROVIDERS } from '../../services/provider-adapter';

describe('provider-adapter', () => {
  beforeEach(() => {
    generateText.mockReset();
    createOpenAI.mockClear();
    createGoogle.mockClear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('only exposes allow-listed providers', () => {
    expect(PROVIDERS.map((p) => p.id)).toEqual(['openai', 'google']);
  });

  it('testConnection rejects an empty key without a network call', async () => {
    const result = await testConnection({ id: '1' }, '');
    expect(result.status).toBe('invalid');
    expect(generateText).not.toHaveBeenCalled();
  });

  it('testConnection accepts a non-empty key', async () => {
    const result = await testConnection({ id: '1' }, 'sk-test');
    expect(result.status).toBe('valid');
  });

  it('requestFeedback throws without a key and never calls fetch', async () => {
    await expect(
      requestFeedback({ connection: {}, key: null, task: 't', workflow: { id: 'feynman' }, contributions: [] })
    ).rejects.toThrow('Model key is unavailable.');
    expect(generateText).not.toHaveBeenCalled();
  });

  it('returns mocked feedback content on a successful response', async () => {
    generateText.mockResolvedValue({ text: 'Here is a gap to consider.' });
    const result = await requestFeedback({
      connection: { provider: 'openai', model: 'gpt-4.1-mini' },
      key: 'sk-test',
      task: 'Explain recursion',
      workflow: { id: 'feynman' },
      contributions: [{ body: 'My explanation' }],
    });
    expect(result.kind).toBe('feedback');
    expect(result.content).toBe('Here is a gap to consider.');
    expect(createOpenAI).toHaveBeenCalledWith({ apiKey: 'sk-test' });
    expect(generateText).toHaveBeenCalledWith(expect.objectContaining({
      model: { apiKey: 'sk-test', model: 'gpt-4.1-mini' },
      maxOutputTokens: 500,
    }));
  });

  it('maps a failed request to a generic safe error, never leaking the key', async () => {
    generateText.mockRejectedValue(new Error('secret provider details sk-secret'));
    await expect(
      requestFeedback({
        connection: { provider: 'openai', model: 'gpt-4.1-mini' },
        key: 'sk-secret',
        task: 't',
        workflow: { id: 'socratic' },
        contributions: [{ body: 'x' }],
      })
    ).rejects.toThrow('Provider request failed.');
  });

  it('uses the Google provider for Google connections', async () => {
    generateText.mockResolvedValue({ text: 'Try checking the base case.' });

    const result = await requestFeedback({
      connection: { provider: 'google', model: 'gemini-2.5-flash' },
      key: 'google-secret',
      task: 'Explain recursion',
      workflow: { id: 'feynman' },
      contributions: [{ body: 'My explanation' }],
    });

    expect(result.content).toBe('Try checking the base case.');
    expect(createGoogle).toHaveBeenCalledWith({ apiKey: 'google-secret' });
    expect(createOpenAI).not.toHaveBeenCalled();
    expect(generateText).toHaveBeenCalledWith(expect.objectContaining({
      model: { apiKey: 'google-secret', model: 'gemini-2.5-flash' },
    }));
  });

  it('suggests an adaptive workflow sequence from the model', async () => {
    generateText.mockResolvedValue({ text: '["socratic","feynman"]' });

    const result = await suggestAdaptiveWorkflowSequence({
      connection: { provider: 'openai', model: 'gpt-4.1-mini' },
      key: 'sk-test',
      task: 'Explain recursion',
      selectionPrompt: 'Start with Socratic questions then reinforce with Feynman.',
      workflowIds: ['feynman', 'socratic'],
      workflows: [
        { id: 'feynman', name: 'Feynman', description: 'Explain it simply.' },
        { id: 'socratic', name: 'Socratic', description: 'Ask probing questions.' },
      ],
    });

    expect(result).toEqual(['socratic', 'feynman']);
    expect(generateText).toHaveBeenCalledWith(expect.objectContaining({
      model: { apiKey: 'sk-test', model: 'gpt-4.1-mini' },
      maxOutputTokens: 300,
    }));
  });

  it('infers Google provider for older saved Gemini connections without provider metadata', async () => {
    generateText.mockResolvedValue({ text: 'Try naming the missing assumption.' });

    await requestFeedback({
      connection: { model: 'gemini-2.5-flash' },
      key: 'google-secret',
      task: 'Explain recursion',
      workflow: { id: 'feynman' },
      contributions: [{ body: 'My explanation' }],
    });

    expect(createGoogle).toHaveBeenCalledWith({ apiKey: 'google-secret' });
    expect(generateText).toHaveBeenCalledWith(expect.objectContaining({
      model: { apiKey: 'google-secret', model: 'gemini-2.5-flash' },
    }));
  });
});
