import { describe, expect, it } from 'vitest';
import { presets } from '../../workflows/presets';
import { validateWorkflow } from '../../workflows/validate-workflow';
import { createSession, currentStep, submit } from '../../workflows/session-machine';
describe('workflow gates', () => { it('requires learner work before feedback', () => expect(validateWorkflow({ name: 'Bad', steps: [{ type: 'ai_feedback' }] })).toContain('Add learner work before AI or an answer.')); it('blocks short contributions', () => { const s = createSession({ task: 'x', workflow: presets[0], connection: { id: 'c', label: 'x', provider: 'openai', model: 'x' } }); expect(submit(s, 'short').currentStepIndex).toBe(0); expect(currentStep(submit(s, 'a'.repeat(150))).type).toBe('ai_feedback'); }); });
