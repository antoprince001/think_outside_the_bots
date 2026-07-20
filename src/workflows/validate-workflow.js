import { ACTIVITIES, ACTORS, AI_SKILLS, minCharactersFor, normalizeStep, normalizeWorkflow } from './workflow-model';

export function validateWorkflow(workflow) {
  const errors = [];
  if (!workflow || typeof workflow !== 'object') return ['Workflow is missing.'];
  if (!workflow.name || !workflow.name.trim()) errors.push('Give the workflow a name.');
  if (workflow.name && (workflow.name.trim().length < 1 || workflow.name.trim().length > 80)) {
    errors.push('Name must be 1-80 characters.');
  }
  if (!Array.isArray(workflow.steps) || workflow.steps.length === 0) {
    errors.push('Add at least one step.');
    return errors;
  }

  const normalized = normalizeWorkflow(workflow);
  let sawLearnerWrite = false;
  let generateCount = 0;

  normalized.steps.forEach((rawStep, index) => {
    const step = normalizeStep(rawStep);
    if (!ACTORS.includes(step.actor)) {
      errors.push(`Step ${index + 1} has an unsupported actor.`);
    }
    if (!ACTIVITIES.includes(step.activity)) {
      errors.push(`Step ${index + 1} has an unsupported activity.`);
      return;
    }

    if (step.activity === 'write') {
      if (step.actor !== 'learner') errors.push(`Step ${index + 1} write activity must be performed by a learner.`);
      if (!step.instruction || !step.instruction.trim()) errors.push(`Step ${index + 1} needs an instruction.`);
      const min = minCharactersFor(step);
      if (!Number.isInteger(min) || min < 1 || min > 10000) {
        errors.push(`Step ${index + 1} minimum characters must be 1-10,000.`);
      }
      if (!step.output) errors.push(`Step ${index + 1} needs an output variable.`);
      sawLearnerWrite = true;
    }

    if (step.activity === 'timer') {
      const duration = Number(step.configuration?.durationSeconds);
      if (!Number.isInteger(duration) || duration < 60 || duration > 3600) {
        errors.push(`Step ${index + 1} timer duration must be 60-3,600 seconds.`);
      }
    }

    if (step.actor === 'ai') {
      if (!sawLearnerWrite) errors.push(`Step ${index + 1} needs a learner contribution first.`);
      if (!step.skill || !AI_SKILLS[step.skill]) {
        errors.push(`Step ${index + 1} has an unsupported AI skill.`);
      }
      if (!step.output) errors.push(`Step ${index + 1} needs an output variable.`);
    }

    if (step.activity === 'generate') {
      generateCount += 1;
    }
  });

  if (!sawLearnerWrite) errors.push('A custom workflow needs at least one learner contribution.');
  if (generateCount > 1) errors.push('Only one generate step is allowed.');

  return errors;
}
