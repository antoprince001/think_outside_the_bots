const PREFIX = 'outside-bots:key:';
const memory = new Map();
export const saveKey = (id, key) => { const value = key.trim(); if (!value) throw new Error('Enter an API key.'); memory.set(id, value); sessionStorage.setItem(PREFIX + id, value); };
export const getKey = (id) => memory.get(id) || sessionStorage.getItem(PREFIX + id) || null;
export const removeKey = (id) => { memory.delete(id); sessionStorage.removeItem(PREFIX + id); };
export const maskKey = (key) => key ? `••••${key.slice(-4)}` : 'No key saved';
export const clearKeys = () => { [...sessionStorage].forEach((_, i) => { const k = sessionStorage.key(i); if (k?.startsWith(PREFIX)) sessionStorage.removeItem(k); }); memory.clear(); };
