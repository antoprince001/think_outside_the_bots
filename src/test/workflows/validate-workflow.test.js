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
      steps: [{ id: 'a', type: 'ai_feedback', feedbackMode: 'draft_feedback' }],
    });
    expect(errors.some((e) => e.includes('learner contribution'))).toBe(true);
  });

  it('rejects more than one final-answer step', () => {
    const errors = validateWorkflow({
      name: 'Two answers',
      steps: [
        { id: 'a', type: 'contribution', prompt: 'Draft', minCharacters: 10 },
        { id: 'b', type: 'final_answer', allowed: true },
        { id: 'c', type: 'final_answer', allowed: true },
      ],
    });
    expect(errors).toContain('Only one final-answer step is allowed.');
  });

  it('rejects an out-of-range minCharacters', () => {
    const errors = validateWorkflow({
      name: 'Bad min',
      steps: [{ id: 'a', type: 'contribution', prompt: 'Draft', minCharacters: 20000 }],
    });
    expect(errors.some((e) => e.includes('minimum characters'))).toBe(true);
  });
});
