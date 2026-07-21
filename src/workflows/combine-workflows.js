function isFinalAnswerStep(step) {
  return step?.activity === 'generate' || step?.skill === 'final_answer' || step?.type === 'final_answer';
}

export function buildCombinedWorkflow(workflows, strategyState) {
  const selectedWorkflows = (strategyState?.selectedWorkflowIds ?? [])
    .map((workflowId) => workflows.find((workflow) => workflow.id === workflowId))
    .filter(Boolean);

  if (selectedWorkflows.length <= 1) {
    return selectedWorkflows[0] ?? workflows[0] ?? null;
  }

  const combinedSteps = [];
  const combinedVariables = {};
  const workflowLabels = [];

  selectedWorkflows.forEach((workflow, workflowIndex) => {
    const slug = String(workflow.name || workflow.id || `workflow-${workflowIndex + 1}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `workflow-${workflowIndex + 1}`;
    const outputNames = new Map();
    const shouldKeepFinalAnswer = workflowIndex === selectedWorkflows.length - 1;

    (workflow.steps ?? []).forEach((step) => {
      if (!shouldKeepFinalAnswer && isFinalAnswerStep(step)) {
        return;
      }

      const nextStep = structuredClone(step);
      const originalOutput = nextStep.output;
      if (originalOutput) {
        const renamedOutput = `${slug}-${originalOutput}`;
        outputNames.set(originalOutput, renamedOutput);
        nextStep.output = renamedOutput;
      }

      if (nextStep.inputs && typeof nextStep.inputs === 'object') {
        Object.entries(nextStep.inputs).forEach(([key, value]) => {
          if (typeof value === 'string') {
            nextStep.inputs[key] = value.replace(/\{\{\s*vars\.([A-Za-z0-9_-]+)\s*\}\}/g, (_match, varName) => `{{vars.${outputNames.get(varName) ?? varName}}}`);
          }
        });
      }

      combinedSteps.push(nextStep);
    });

    workflowLabels.push(workflow.name || workflow.id);
  });

  combinedSteps.forEach((step) => {
    if (step.output) combinedVariables[step.output] = null;
  });

  const finalStep = [...combinedSteps].reverse().find((step) => step.output);
  return {
    id: `combined-${Date.now()}`,
    name: workflowLabels.join(' + '),
    kind: 'custom',
    description: 'A combined workflow built from multiple paths.',
    inputs: ['problem'],
    variables: combinedVariables,
    steps: combinedSteps,
    outputs: finalStep ? { answer: `{{vars.${finalStep.output}}}` } : {},
    configuration: {
      reaskEnabled: true,
      reaskLimit: 3,
      strategyMode: strategyState?.strategyMode ?? 'multiple',
      selectionPrompt: strategyState?.selectionPrompt ?? '',
      workflowIds: (strategyState?.selectedWorkflowIds ?? []).filter(Boolean),
    },
  };
}
