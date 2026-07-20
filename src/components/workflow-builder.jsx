import { useMemo, useState } from 'react';
import { validateWorkflow } from '../workflows/validate-workflow';
import { uid } from '../utils/uid';

const MIN_CHARACTERS_FLOOR = 1;
const MIN_CHARACTERS_CEILING = 10000;

function buildWorkflow(name, minimumCharacters) {
  return {
    id: uid(),
    name,
    kind: 'custom',
    description: 'Your saved cognitive-friction workflow.',
    inputs: ['problem'],
    variables: {
      draft: null,
      feedback: null,
      finalAnswer: null,
    },
    steps: [
      {
        id: 'draft',
        actor: 'learner',
        activity: 'write',
        instruction: 'Write your first attempt.',
        validation: {
          minCharacters: Number(minimumCharacters),
        },
        output: 'draft',
      },
      {
        id: 'feedback',
        actor: 'ai',
        activity: 'feedback',
        skill: 'draft_feedback',
        inputs: {
          problem: '{{inputs.problem}}',
          draft: '{{vars.draft}}',
        },
        output: 'feedback',
      },
      {
        id: 'answer',
        actor: 'ai',
        activity: 'generate',
        skill: 'final_answer',
        inputs: {
          problem: '{{inputs.problem}}',
          draft: '{{vars.draft}}',
        },
        output: 'finalAnswer',
      },
    ],
    outputs: {
      answer: '{{vars.finalAnswer}}',
    },
  };
}

/**
 * Lets a student assemble a simple custom workflow (draft → AI feedback →
 * optional final answer) with a configurable minimum draft length. Runs the
 * same validate-workflow rules used everywhere else, so an invalid draft
 * cannot be saved.
 */
export function WorkflowBuilder({ persist, onSaved }) {
  const [name, setName] = useState('My study workflow');
  const [minimumCharacters, setMinimumCharacters] = useState(200);

  const workflow = useMemo(
    () => buildWorkflow(name, minimumCharacters),
    [name, minimumCharacters]
  );
  const errors = useMemo(() => validateWorkflow(workflow), [workflow]);

  function handleSave() {
    if (errors.length > 0) return;
    persist((draft) => draft.workflows.push(workflow));
    onSaved(workflow);
  }

  return (
    <section className="panel">
      <h2>Create a mode</h2>
      <input value={name} onChange={(event) => setName(event.target.value)} aria-label="Workflow name" />
      <label>
        Minimum draft characters
        <input
          type="number"
          min={MIN_CHARACTERS_FLOOR}
          max={MIN_CHARACTERS_CEILING}
          value={minimumCharacters}
          onChange={(event) => setMinimumCharacters(event.target.value)}
        />
      </label>
      <p>Sequence: learner draft → AI feedback → optional final answer</p>

      {errors.map((message) => (
        <p className="error" key={message}>
          {message}
        </p>
      ))}

      <button type="button" className="primary" disabled={errors.length > 0} onClick={handleSave}>
        Save workflow
      </button>
    </section>
  );
}
