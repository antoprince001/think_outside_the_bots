import { describe, it, expect } from 'vitest';
import { buildCombinedWorkflow } from '../../workflows/combine-workflows';

describe('buildCombinedWorkflow', () => {
  it('keeps the final answer step only on the last selected workflow', () => {
    const workflows = [
      {
        id: 'feynman',
        name: 'Feynman',
        steps: [
          { id: 'a', actor: 'learner', activity: 'write', output: 'draft' },
          { id: 'b', actor: 'ai', activity: 'feedback', output: 'feedback' },
          { id: 'c', actor: 'ai', activity: 'generate', skill: 'final_answer', output: 'answer' },
        ],
      },
      {
        id: 'socratic',
        name: 'Socratic',
        steps: [
          { id: 'd', actor: 'learner', activity: 'write', output: 'draft2' },
          { id: 'e', actor: 'ai', activity: 'feedback', output: 'feedback2' },
          { id: 'f', actor: 'ai', activity: 'generate', skill: 'final_answer', output: 'answer2' },
        ],
      },
    ];

    const combined = buildCombinedWorkflow(workflows, { selectedWorkflowIds: ['feynman', 'socratic'], strategyMode: 'multiple' });

    const nonFinalSteps = combined.steps.filter((step) => step.activity !== 'generate');
    expect(nonFinalSteps).toHaveLength(4);
    expect(combined.steps.filter((step) => step.activity === 'generate')).toHaveLength(1);
    expect(combined.steps.at(-1).output).toContain('answer2');
  });
});
