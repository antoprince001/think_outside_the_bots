import { afterEach, expect, it } from 'vitest';
import { load, update } from '../../services/local-store';
afterEach(() => localStorage.clear()); it('persists safe local records', () => { update(d => d.workflows.push({ id: 'w' })); expect(load().workflows).toEqual([{ id: 'w' }]); });
