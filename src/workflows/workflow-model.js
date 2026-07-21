import { parse } from 'yaml';
import metadataYaml from './workflow-metadata.yaml?raw';
import presetsYaml from './presets.yaml?raw';

const LEGACY_STEP_MAP = {
  contribution: { actor: 'learner', activity: 'write', output: 'draft' },
  freeze: { actor: 'system', activity: 'timer' },
  ai_feedback: { actor: 'ai', activity: 'feedback', output: 'feedback' },
  final_answer: { actor: 'ai', activity: 'generate', output: 'finalAnswer' },
};

const parsedMetadata = parse(metadataYaml) ?? {};
const parsedPresets = parse(presetsYaml) ?? {};

const DEFAULT_ACTIVITY_DEFINITIONS = [
  { id: 'write', label: 'Learner response', actor: 'learner', description: 'Learner contributes their own attempt.' },
  { id: 'feedback', label: 'Ask AI', actor: 'ai', description: 'AI responds with guidance.' },
  { id: 'generate', label: 'Final answer', actor: 'ai', description: 'AI provides a worked explanation.' },
  { id: 'hint', label: 'Hint', actor: 'ai', description: 'AI offers a small nudge.' },
  { id: 'timer', label: 'Timer', actor: 'system', description: 'Pause the session for a set period.' },
  { id: 'decision', label: 'Decision', actor: 'system', description: 'Branch to a different path.' },
  { id: 'display', label: 'System says', actor: 'system', description: 'Show context or instructions.' },
  { id: 'quiz', label: 'Quiz', actor: 'learner', description: 'Check understanding with a quick quiz.' },
  { id: 'upload', label: 'Upload', actor: 'learner', description: 'Attach evidence or notes.' },
  { id: 'review', label: 'Review', actor: 'learner', description: 'Review previous work.' },
  { id: 'end', label: 'End', actor: 'system', description: 'Close the workflow.' },
];

const DEFAULT_ACTOR_DEFINITIONS = [
  { id: 'learner', label: 'Learner' },
  { id: 'ai', label: 'AI' },
  { id: 'system', label: 'System' },
  { id: 'teacher', label: 'Teacher' },
];

const DEFAULT_SKILL_DEFINITIONS = {
  gap_feedback: {
    prompt: 'Give concise gap feedback on the student explanation. Do not provide the final solution.',
    reaskPrompt: 'Ask one concise follow-up question that helps the learner refine the explanation without giving the answer.',
  },
  draft_feedback: {
    prompt: 'Give concise feedback on the student draft. Do not provide a direct solution.',
    reaskPrompt: 'Ask one concise follow-up question that helps the learner improve the draft without giving the answer.',
  },
  socratic_question: {
    prompt: 'Ask one concise Socratic follow-up question. Do not provide a direct solution.',
    reaskPrompt: 'Ask a short follow-up question that nudges the learner toward their own insight without revealing the answer.',
  },
  final_answer: {
    prompt: 'Provide a clear worked explanation. Invite the learner to compare it with their own reasoning.',
    reaskPrompt: 'Offer a brief re-ask that focuses the learner on the strongest missing concept before giving the answer.',
  },
  spaced_repetition_reinforce: {
    prompt: 'Review the learner\'s first attempt and highlight the **key concepts** they need to remember. Use bold text to emphasize core ideas. Do not provide the full solution yet.',
    reaskPrompt: 'Reinforce the key concepts again, focusing on what the learner should recall.',
  },
  spaced_repetition_verify: {
    prompt: 'Compare the learner\'s second attempt with the concepts you reinforced. Affirm what they recalled correctly and gently correct any gaps.',
    reaskPrompt: 'Verify their understanding and offer a final clarification.',
  },
};

function normalizeSkillDefinitions(source) {
  return Object.fromEntries(
    Object.entries(source ?? {}).map(([id, definition]) => {
      if (typeof definition === 'string') {
        return [id, { prompt: definition, reaskPrompt: definition }];
      }
      return [id, { prompt: definition?.prompt ?? '', reaskPrompt: definition?.reaskPrompt ?? definition?.prompt ?? '' }];
    }),
  );
}

export const WORKFLOW_APPROACH_DEFINITIONS = [
  { id: 'feynman', label: 'Feynman', description: 'Explain it simply and check for gaps.' },
  { id: 'socratic', label: 'Socratic', description: 'Ask guiding questions instead of giving answers.' },
  { id: 'freeze', label: 'Freeze', description: 'Pause to reflect before responding.' },
  { id: 'long-draft', label: 'Long draft', description: 'Build a fuller draft and refine it.' },
  { id: 'spaced-repetition', label: 'Spaced repetition', description: 'Revisit the idea to reinforce it later.' },
];

export const WORKFLOW_STRATEGY_MODES = [
  { id: 'single', label: 'Single path' },
  { id: 'multiple', label: 'Multiple paths' },
  { id: 'adaptive', label: 'Adaptive path' },
];

const metadataActivities = Array.isArray(parsedMetadata.activities) ? parsedMetadata.activities : DEFAULT_ACTIVITY_DEFINITIONS;
const metadataActors = Array.isArray(parsedMetadata.actors) ? parsedMetadata.actors : DEFAULT_ACTOR_DEFINITIONS;
const metadataSkills = normalizeSkillDefinitions(parsedMetadata.skills);

export const ACTIVITY_DEFINITIONS = metadataActivities.map((activity) => ({ ...activity }));
export const ACTOR_DEFINITIONS = metadataActors.map((actor) => ({ ...actor }));
export const AI_SKILL_DEFINITIONS = {
  ...DEFAULT_SKILL_DEFINITIONS,
  ...metadataSkills,
};

export const ACTIVITIES = ACTIVITY_DEFINITIONS.map((activity) => activity.id);
export const ACTORS = ACTOR_DEFINITIONS.map((actor) => actor.id);
export const AI_SKILLS = Object.fromEntries(
  Object.entries(AI_SKILL_DEFINITIONS).map(([id, definition]) => [id, definition.prompt]),
);
export const DEFAULT_REASK_LIMIT = Number(parsedMetadata?.global?.defaultReaskLimit ?? parsedPresets?.defaults?.reaskLimit ?? 3) || 3;
export const REASK_ENABLED_BY_DEFAULT = parsedMetadata?.global?.allowReask ?? parsedPresets?.defaults?.reaskEnabled ?? true;
export const BUILDER_NODE_TYPES = parsedMetadata.builderNodeTypes && typeof parsedMetadata.builderNodeTypes === 'object'
  ? parsedMetadata.builderNodeTypes
  : {};

export function getActivityDefinitions() {
  return ACTIVITY_DEFINITIONS;
}

export function getBuilderNodeTypes() {
  return BUILDER_NODE_TYPES;
}

export function getWorkflowConfiguration(workflow = {}) {
  const config = workflow?.configuration ?? {};
  const reaskEnabled = config?.reaskEnabled ?? workflow?.reaskEnabled ?? REASK_ENABLED_BY_DEFAULT;
  const reaskLimit = Number(config?.reaskLimit ?? workflow?.reaskLimit ?? DEFAULT_REASK_LIMIT);
  const strategyModeValue = config?.strategyMode ?? workflow?.strategyMode ?? 'single';
  const strategyMode = strategyModeValue === 'adaptive' || strategyModeValue === 'dynamic' ? 'adaptive' : strategyModeValue === 'multiple' || strategyModeValue === 'hybrid' ? 'multiple' : 'single';
  const approaches = Array.isArray(config?.approaches ?? workflow?.approaches)
    ? (config?.approaches ?? workflow?.approaches).filter((item) => typeof item === 'string' && item.trim())
    : [];
  const workflowIds = Array.isArray(config?.workflowIds ?? workflow?.workflowIds)
    ? (config?.workflowIds ?? workflow?.workflowIds).filter((item) => typeof item === 'string' && item.trim())
    : [];
  const selectionPrompt = config?.selectionPrompt ?? workflow?.selectionPrompt ?? '';

  return {
    reaskEnabled: reaskEnabled === true || reaskEnabled === 'true',
    reaskLimit: Number.isFinite(reaskLimit) && reaskLimit > 0 ? Math.min(Math.round(reaskLimit), 3) : DEFAULT_REASK_LIMIT,
    strategyMode,
    approaches,
    workflowIds,
    selectionPrompt: typeof selectionPrompt === 'string' ? selectionPrompt : '',
  };
}

export function getSkillDefinition(skillId) {
  return AI_SKILL_DEFINITIONS[skillId] ?? AI_SKILL_DEFINITIONS.draft_feedback ?? { prompt: '', reaskPrompt: '' };
}

export function getAIInstruction(skillId, { reaskCount = 0 } = {}) {
  const definition = getSkillDefinition(skillId);
  const baseInstruction = definition?.prompt ?? '';
  const reaskInstruction = reaskCount > 0 ? definition?.reaskPrompt ?? '' : '';
  return [baseInstruction, reaskInstruction].filter(Boolean).join(' ');
}

export function normalizeStep(step = {}) {
  const legacy = LEGACY_STEP_MAP[step.type] ?? {};
  const activity = step.activity ?? legacy.activity;
  const actor = step.actor ?? legacy.actor;
  const validation = {
    ...(step.minCharacters ? { minCharacters: step.minCharacters } : {}),
    ...(step.validation ?? {}),
  };
  const configuration = {
    ...(step.durationSeconds ? { durationSeconds: step.durationSeconds } : {}),
    ...(step.message ? { message: step.message } : {}),
    ...(step.configuration ?? {}),
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
    configuration: {
      ...(workflow?.configuration ?? {}),
    },
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

export function withTimerDuration(workflow, durationSeconds) {
  return {
    ...workflow,
    steps: (workflow.steps ?? []).map((step) => {
      const normalized = normalizeStep(step);
      if (normalized.activity !== 'timer') return step;
      return {
        ...step,
        configuration: {
          ...normalized.configuration,
          durationSeconds,
        },
      };
    }),
  };
}
