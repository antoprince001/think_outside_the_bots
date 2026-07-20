import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveKey, getKey, removeKey, maskKey, clearKeys } from '../../services/credential-store';
import { createSession, submit } from '../../workflows/session-machine';
import { presets } from '../../workflows/presets';
import * as providerAdapter from '../../services/provider-adapter';

describe('credential-store', () => {
  beforeEach(() => {
    clearKeys();
    sessionStorage.clear();
  });

  it('saves a key to memory and sessionStorage only', () => {
    saveKey('conn-1', 'sk-abcdef1234');
    expect(getKey('conn-1')).toBe('sk-abcdef1234');
    expect(sessionStorage.getItem('outside-bots:key:conn-1')).toBe('sk-abcdef1234');
    expect(localStorage.getItem('outside-bots:key:conn-1')).toBeNull();
  });

  it('rejects an empty key', () => {
    expect(() => saveKey('conn-1', '   ')).toThrow();
  });

  it('masks a key showing only the last four characters', () => {
    expect(maskKey('sk-abcdef1234')).toBe('••••1234');
    expect(maskKey(null)).toBe('No key saved');
  });

  it('removes a key from memory and storage', () => {
    saveKey('conn-1', 'sk-abcdef1234');
    removeKey('conn-1');
    expect(getKey('conn-1')).toBeNull();
  });

  it('clearKeys wipes every stored key', () => {
    saveKey('conn-1', 'sk-one1111111');
    saveKey('conn-2', 'sk-two2222222');
    clearKeys();
    expect(getKey('conn-1')).toBeNull();
    expect(getKey('conn-2')).toBeNull();
  });

  it('never writes the key into a persisted session record (T027 regression)', () => {
    saveKey('conn-1', 'sk-super-secret-value');
    const feynman = presets.find((p) => p.id === 'feynman');
    let session = createSession({
      task: 'x',
      workflow: feynman,
      connection: { id: 'conn-1', label: 'Test', provider: 'openai', model: 'gpt-4.1-mini' },
    });
    session = submit(session, 'a'.repeat(150));

    const serialized = JSON.stringify(session);
    expect(serialized).not.toContain('sk-super-secret-value');
    expect(session.modelSnapshot).not.toHaveProperty('key');
  });

  it('never surfaces the key in a provider failure error (T027 regression)', async () => {
    saveKey('conn-1', 'sk-super-secret-value');
    global.fetch = vi.fn().mockResolvedValue({ ok: false });

    let caught;
    try {
      await providerAdapter.requestFeedback({
        connection: { model: 'gpt-4.1-mini' },
        key: getKey('conn-1'),
        task: 'x',
        workflow: { id: 'feynman' },
        contributions: [{ body: 'x' }],
      });
    } catch (error) {
      caught = error;
    }

    expect(caught?.message).not.toContain('sk-super-secret-value');
  });
});
