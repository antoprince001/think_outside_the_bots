import { describe, it, expect } from 'vitest';
import { validateWorkflow } from '../../workflows/validate-workflow';
import { presets } from '../../workflows/presets';

describe('validateWorkflow', () => {
  it('accepts every prebuilt preset', () => {
    presets.forEach((preset) => {
      expect(validateWorkflow(preset)).toEqual([]);
    });
  });

  it('rejects a workflow with no steps', () => {
    expect(validateWorkflow({ name: 'Empty', steps: [] })).toContain('Add at least one step.');
  });

  it('rejects a workflow with no learner contribution', () => {
    const errors = validateWorkflow({
      name: 'No gate',
      steps: [{ id: 'a', actor: 'ai', activity: 'feedback', skill: 'draft_feedback', output: 'feedback' }],
    });
    expect(errors.some((e) => e.includes('learner contribution'))).toBe(true);
  });

  it('rejects more than one final-answer step', () => {
    const errors = validateWorkflow({
      name: 'Two answers',
      steps: [
        { id: 'a', actor: 'learner', activity: 'write', instruction: 'Draft', validation: { minCharacters: 10 }, output: 'draft' },
        { id: 'b', actor: 'ai', activity: 'generate', skill: 'final_answer', output: 'answer' },
        { id: 'c', actor: 'ai', activity: 'generate', skill: 'final_answer', output: 'answer2' },
      ],
    });
    expect(errors).toContain('Only one generate step is allowed.');
  });

  it('rejects an out-of-range minCharacters', () => {
    const errors = validateWorkflow({
      name: 'Bad min',
      steps: [{ id: 'a', actor: 'learner', activity: 'write', instruction: 'Draft', validation: { minCharacters: 20000 }, output: 'draft' }],
    });
    expect(errors.some((e) => e.includes('minimum characters'))).toBe(true);
  });

  it('accepts legacy step types through normalization', () => {
    expect(validateWorkflow({
      name: 'Legacy',
      steps: [
        { id: 'a', type: 'contribution', prompt: 'Draft', minCharacters: 10 },
        { id: 'b', type: 'ai_feedback', feedbackMode: 'draft_feedback' },
        { id: 'c', type: 'final_answer', allowed: true },
      ],
    })).toEqual([]);
  });
});
