const LEGACY_STEP_MAP = {
  contribution: { actor: 'learner', activity: 'write', output: 'draft' },
  freeze: { actor: 'system', activity: 'timer' },
  ai_feedback: { actor: 'ai', activity: 'feedback', output: 'feedback' },
  final_answer: { actor: 'ai', activity: 'generate', output: 'finalAnswer' },
};

export const AI_SKILLS = {
  gap_feedback:
    'Give concise gap feedback on the student explanation. Do not provide the final solution.',
  draft_feedback:
    'Give concise feedback on the student draft. Do not provide a direct solution.',
  socratic_question:
    'Ask one concise Socratic follow-up question. Do not provide a direct solution.',
  final_answer:
    'Provide a clear worked explanation. Invite the learner to compare it with their own reasoning.',
};

export const ACTIVITIES = ['write', 'feedback', 'generate', 'hint', 'timer', 'decision', 'display', 'quiz', 'upload', 'review', 'end'];
export const ACTORS = ['learner', 'ai', 'system', 'teacher'];

export function normalizeStep(step = {}) {
  const legacy = LEGACY_STEP_MAP[step.type] ?? {};
  const activity = step.activity ?? legacy.activity;
  const actor = step.actor ?? legacy.actor;
  const validation = {
    ...(step.validation ?? {}),
    ...(step.minCharacters ? { minCharacters: step.minCharacters } : {}),
  };
  const configuration = {
    ...(step.configuration ?? {}),
    ...(step.durationSeconds ? { durationSeconds: step.durationSeconds } : {}),
    ...(step.message ? { message: step.message } : {}),
  };

  return {
    ...step,
    actor,
    activity,
    instruction: step.instruction ?? step.prompt,
    skill: step.skill ?? step.feedbackMode ?? (step.type === 'final_answer' ? 'final_answer' : undefined),
    validation,
    configuration,
    output: step.output ?? step.contributionKind ?? legacy.output,
  };
}

export function normalizeWorkflow(workflow) {
  return {
    inputs: ['problem'],
    variables: {},
    outputs: {},
    ...workflow,
    steps: (workflow.steps ?? []).map(normalizeStep),
  };
}

export function minCharactersFor(step) {
  return Number(step?.validation?.minCharacters ?? step?.minCharacters ?? 0);
}

export function durationSecondsFor(step) {
  return Number(step?.configuration?.durationSeconds ?? step?.durationSeconds ?? 0);
}

export function renderTemplate(template, context) {
  if (typeof template !== 'string') return template;
  return template.replaceAll(/\{\{\s*(inputs|vars)\.([\w-]+)\s*\}\}/g, (_match, scope, key) => {
    return context[scope]?.[key] ?? '';
  });
}

export function resolveStepInputs(step, session) {
  const values = {};
  const context = {
    inputs: session.inputs ?? { problem: session.task },
    vars: session.variables ?? {},
  };
  Object.entries(step?.inputs ?? {}).forEach(([key, value]) => {
    values[key] = renderTemplate(value, context);
  });
  return values;
}
