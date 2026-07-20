import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { testConnection, requestFeedback, PROVIDERS } from '../../services/provider-adapter';

describe('provider-adapter', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('only exposes allow-listed providers', () => {
    expect(PROVIDERS.map((p) => p.id)).toEqual(['openai']);
  });

  it('testConnection rejects an empty key without a network call', async () => {
    const result = await testConnection({ id: '1' }, '');
    expect(result.status).toBe('invalid');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('testConnection accepts a non-empty key', async () => {
    const result = await testConnection({ id: '1' }, 'sk-test');
    expect(result.status).toBe('valid');
  });

  it('requestFeedback throws without a key and never calls fetch', async () => {
    await expect(
      requestFeedback({ connection: {}, key: null, task: 't', workflow: { id: 'feynman' }, contributions: [] })
    ).rejects.toThrow('Model key is unavailable.');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns mocked feedback content on a successful response', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Here is a gap to consider.' } }] }),
    });
    const result = await requestFeedback({
      connection: { model: 'gpt-4.1-mini' },
      key: 'sk-test',
      task: 'Explain recursion',
      workflow: { id: 'feynman' },
      contributions: [{ body: 'My explanation' }],
    });
    expect(result.kind).toBe('feedback');
    expect(result.content).toBe('Here is a gap to consider.');
  });

  it('maps a failed request to a generic safe error, never leaking the key', async () => {
    fetch.mockResolvedValue({ ok: false });
    await expect(
      requestFeedback({
        connection: { model: 'gpt-4.1-mini' },
        key: 'sk-secret',
        task: 't',
        workflow: { id: 'socratic' },
        contributions: [{ body: 'x' }],
      })
    ).rejects.toThrow('Provider request failed.');
  });
});
