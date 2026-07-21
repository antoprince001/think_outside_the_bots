import { describe, expect, it } from 'vitest';
import { presets } from '../../workflows/presets';
import {
  AI_SKILLS,
  DEFAULT_REASK_LIMIT,
  getActivityDefinitions,
  getBuilderNodeTypes,
  getWorkflowConfiguration,
} from '../../workflows/workflow-model';

describe('workflow configuration', () => {
  it('loads prebuilt workflows from the YAML-backed preset registry', () => {
    const feynman = presets.find((preset) => preset.id === 'feynman');
    expect(feynman).toBeDefined();
    expect(feynman.steps[0].instruction).toContain('Explain');
  });

  it('exposes a configurable global re-ask limit and editable skill prompts', () => {
    expect(DEFAULT_REASK_LIMIT).toBe(3);
    expect(AI_SKILLS.gap_feedback).toContain('gap');
    expect(getWorkflowConfiguration({}).reaskLimit).toBe(DEFAULT_REASK_LIMIT);
    expect(getActivityDefinitions().some((activity) => activity.id === 'feedback')).toBe(true);
    expect(getBuilderNodeTypes().write.defaults.title).toBe('Learner response');
  });
});
