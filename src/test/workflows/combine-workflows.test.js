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

  it('reorders selected workflows dynamically for adaptive mode based on the selection prompt', () => {
    const workflows = [
      {
        id: 'feynman',
        name: 'Feynman',
        description: 'Explain it simply and check for gaps.',
        steps: [{ id: 'a', actor: 'learner', activity: 'write', output: 'draft' }],
      },
      {
        id: 'socratic',
        name: 'Socratic',
        description: 'Ask probing questions to help the learner reflect.',
        steps: [{ id: 'b', actor: 'learner', activity: 'write', output: 'draft2' }],
      },
    ];

    const combined = buildCombinedWorkflow(workflows, {
      selectedWorkflowIds: ['feynman', 'socratic'],
      strategyMode: 'adaptive',
      selectionPrompt: 'Start with Socratic questions if the learner is stuck, then use Feynman to reinforce the idea.',
    });

    expect(combined.steps[0].output).toBe('socratic-draft2');
    expect(combined.steps[1].output).toBe('feynman-draft');
  });

  it('uses the selected freeze duration when a freeze workflow is combined into multiple paths', () => {
    const workflows = [
      {
        id: 'freeze',
        name: 'Freeze',
        steps: [{ id: 'freeze-step', actor: 'system', activity: 'timer', configuration: { durationSeconds: 180 } }],
      },
      {
        id: 'socratic',
        name: 'Socratic',
        steps: [{ id: 'a', actor: 'learner', activity: 'write', output: 'draft' }],
      },
    ];

    const combined = buildCombinedWorkflow(workflows, {
      selectedWorkflowIds: ['freeze', 'socratic'],
      strategyMode: 'multiple',
      freezeDurationSeconds: 600,
    });

    expect(combined.steps[0].configuration.durationSeconds).toBe(600);
  });
});
