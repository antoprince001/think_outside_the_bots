// Session-scoped API key storage.
//
// Keys are held in an in-memory Map (fastest read path) and mirrored to
// sessionStorage so a page refresh within the same tab does not lose them.
// Keys are intentionally never written to localStorage and never included
// in any exported or persisted application record.

const SESSION_STORAGE_PREFIX = 'outside-bots:key:';

const keysByConnectionId = new Map();

function storageKeyFor(connectionId) {
  return `${SESSION_STORAGE_PREFIX}${connectionId}`;
}

export function saveKey(connectionId, key) {
  const trimmedKey = (key ?? '').trim();
  if (!trimmedKey) {
    throw new Error('Enter an API key.');
  }

  keysByConnectionId.set(connectionId, trimmedKey);
  sessionStorage.setItem(storageKeyFor(connectionId), trimmedKey);
}

export function getKey(connectionId) {
  return (
    keysByConnectionId.get(connectionId) ??
    sessionStorage.getItem(storageKeyFor(connectionId)) ??
    null
  );
}

export function removeKey(connectionId) {
  keysByConnectionId.delete(connectionId);
  sessionStorage.removeItem(storageKeyFor(connectionId));
}

export function maskKey(key) {
  return key ? `••••${key.slice(-4)}` : 'No key saved';
}

/** Clears every key this module has stored, e.g. on logout or in tests. */
export function clearKeys() {
  const sessionKeysToRemove = [];
  for (let index = 0; index < sessionStorage.length; index += 1) {
    const storageKey = sessionStorage.key(index);
    if (storageKey?.startsWith(SESSION_STORAGE_PREFIX)) {
      sessionKeysToRemove.push(storageKey);
    }
  }
  sessionKeysToRemove.forEach((storageKey) => sessionStorage.removeItem(storageKey));
  keysByConnectionId.clear();
}
