import { describe, it, expect, beforeEach } from 'vitest';
import { load, save, update } from '../../services/local-store';

describe('local-store', () => {
  beforeEach(() => localStorage.clear());

  it('returns fallback shape when nothing is stored', () => {
    const data = load();
    expect(data).toEqual({ connections: [], workflows: [], sessions: [] });
  });

  it('persists and reloads data', () => {
    save({ connections: [{ id: '1' }], workflows: [], sessions: [] });
    const data = load();
    expect(data.connections).toHaveLength(1);
  });

  it('recovers from corrupted storage', () => {
    localStorage.setItem('outside-bots:v1', 'not json');
    const data = load();
    expect(data).toEqual({ connections: [], workflows: [], sessions: [] });
  });

  it('update mutates and persists in one step', () => {
    const result = update((d) => d.sessions.push({ id: 'a' }));
    expect(result.sessions).toHaveLength(1);
    expect(load().sessions).toHaveLength(1);
  });
});
