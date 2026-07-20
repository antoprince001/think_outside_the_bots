const KEY = 'outside-bots:v1';
const fallback = { connections: [], workflows: [], sessions: [] };
export function load() { try { return { ...fallback, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...fallback }; } }
export function save(data) { localStorage.setItem(KEY, JSON.stringify(data)); return data; }
export function update(mutator) { const data = load(); mutator(data); return save(data); }
