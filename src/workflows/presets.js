export const presets = [
  {
    id: 'feynman',
    name: 'Feynman technique',
    kind: 'prebuilt',
    description: 'Explain it in your own words first. AI points out the gaps.',
    finalAnswerPolicy: 'allowed',
    steps: [
      {
        id: 'explain',
        type: 'contribution',
        prompt: 'Explain the task in your own words, as if teaching someone new to it.',
        contributionKind: 'explanation',
        minCharacters: 120,
      },
      { id: 'feedback', type: 'ai_feedback', feedbackMode: 'gap_feedback' },
      { id: 'answer', type: 'final_answer', allowed: true },
    ],
  },
  {
    id: 'socratic',
    name: 'Socratic questioning',
    kind: 'prebuilt',
    description: 'Respond to focused questions instead of getting a direct answer.',
    finalAnswerPolicy: 'never',
    steps: [
      {
        id: 'respond',
        type: 'contribution',
        prompt: 'Share your current thinking or attempt.',
        contributionKind: 'response',
        minCharacters: 40,
      },
      { id: 'question', type: 'ai_feedback', feedbackMode: 'socratic_question' },
    ],
  },
  {
    id: 'freeze',
    name: 'AI freeze window',
    kind: 'prebuilt',
    description: 'AI stays paused for a set time while you draft.',
    finalAnswerPolicy: 'allowed',
    steps: [
      {
        id: 'draft',
        type: 'contribution',
        prompt: 'Start drafting your own attempt.',
        contributionKind: 'draft',
        minCharacters: 1,
      },
      { id: 'wait', type: 'freeze', prompt: 'Keep drafting — AI is paused.', durationSeconds: 180 },
      { id: 'feedback', type: 'ai_feedback', feedbackMode: 'draft_feedback' },
      { id: 'answer', type: 'final_answer', allowed: true },
    ],
  },
  {
    id: 'long-draft',
    name: 'Long draft mode',
    kind: 'prebuilt',
    description: 'Write a substantial draft before AI feedback unlocks.',
    finalAnswerPolicy: 'allowed',
    steps: [
      {
        id: 'draft',
        type: 'contribution',
        prompt: 'Write a full draft attempt at the task.',
        contributionKind: 'draft',
        minCharacters: 600,
      },
      { id: 'feedback', type: 'ai_feedback', feedbackMode: 'draft_feedback' },
      { id: 'answer', type: 'final_answer', allowed: true },
    ],
  },
];
