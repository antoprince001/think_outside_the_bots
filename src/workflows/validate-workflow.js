const VALID_TYPES = ['contribution', 'freeze', 'ai_feedback', 'final_answer'];

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

  let sawContribution = false;
  let finalAnswerCount = 0;

  workflow.steps.forEach((step, index) => {
    if (!VALID_TYPES.includes(step.type)) {
      errors.push(`Step ${index + 1} has an unsupported type.`);
      return;
    }
    if (step.type === 'contribution') {
      if (!step.prompt || !step.prompt.trim()) errors.push(`Step ${index + 1} needs a prompt.`);
      const min = Number(step.minCharacters);
      if (!Number.isInteger(min) || min < 1 || min > 10000) {
        errors.push(`Step ${index + 1} minimum characters must be 1-10,000.`);
      }
      sawContribution = true;
    }
    if (step.type === 'freeze') {
      const duration = Number(step.durationSeconds);
      if (!Number.isInteger(duration) || duration < 60 || duration > 3600) {
        errors.push(`Step ${index + 1} freeze duration must be 60-3,600 seconds.`);
      }
    }
    if (step.type === 'ai_feedback') {
      if (!sawContribution) errors.push(`Step ${index + 1} needs a learner contribution first.`);
      if (!['gap_feedback', 'socratic_question', 'draft_feedback'].includes(step.feedbackMode)) {
        errors.push(`Step ${index + 1} has an unsupported feedback mode.`);
      }
    }
    if (step.type === 'final_answer') {
      finalAnswerCount += 1;
      if (!sawContribution) errors.push(`Step ${index + 1} needs a learner contribution first.`);
    }
  });

  if (!sawContribution) errors.push('A custom workflow needs at least one learner contribution.');
  if (finalAnswerCount > 1) errors.push('Only one final-answer step is allowed.');

  return errors;
}
