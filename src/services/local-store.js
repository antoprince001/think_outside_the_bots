// Browser-local persistence for non-secret application data: connection
// metadata, workflows, and session records. API keys are never stored
// here — see credential-store.js.

const STORAGE_KEY = 'outside-bots:v1';

const EMPTY_STORE = { connections: [], workflows: [], sessions: [] };

/** Reads the store, falling back to an empty shape if unset or corrupted. */
export function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { ...EMPTY_STORE, ...parsed };
  } catch {
    return { ...EMPTY_STORE };
  }
}

export function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
}

/**
 * Loads the current store, applies an in-place mutator to it, persists the
 * result, and returns the updated store.
 */
export function update(mutator) {
  const data = load();
  mutator(data);
  return save(data);
}
