import { afterEach, expect, it } from 'vitest';
import { getKey, maskKey, removeKey, saveKey } from '../../services/credential-store';
afterEach(() => sessionStorage.clear()); it('stores and masks a session-scoped key', () => { saveKey('a', 'secret1234'); expect(getKey('a')).toBe('secret1234'); expect(maskKey(getKey('a'))).toBe('••••1234'); removeKey('a'); expect(getKey('a')).toBeNull(); });
