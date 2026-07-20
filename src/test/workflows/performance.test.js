import { expect, it } from 'vitest';
import { createSession } from '../../workflows/session-machine';
import { presets } from '../../workflows/presets';
it('creates 100 local sessions promptly', () => { const started = performance.now(); for (let i = 0; i < 100; i++) createSession({ task: 'x', workflow: presets[0], connection: { id: String(i), label: 'x', provider: 'openai', model: 'x' } }); expect(performance.now() - started).toBeLessThan(1000); });
