import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Bot, Clock, MessageSquare, Plus, Trash2, UserRound } from 'lucide-react';
import { validateWorkflow } from '../workflows/validate-workflow';
import { uid } from '../utils/uid';

const MIN_CHARACTERS_FLOOR = 1;
const MIN_CHARACTERS_CEILING = 10000;

const NODE_TYPES = {
  display: {
    label: 'System says',
    actor: 'system',
    activity: 'display',
    icon: MessageSquare,
    defaults: {
      title: 'Set context',
      text: 'Take a moment to think before using AI.',
    },
  },
  write: {
    label: 'Learner responds',
    actor: 'learner',
    activity: 'write',
    icon: UserRound,
    defaults: {
      title: 'Learner response',
      text: 'Write your own attempt before AI responds.',
      minCharacters: 120,
    },
  },
  feedback: {
    label: 'Ask AI',
    actor: 'ai',
    activity: 'feedback',
    icon: Bot,
    defaults: {
      title: 'AI feedback',
      text: 'Give feedback on the learner response without solving it directly.',
    },
  },
  timer: {
    label: 'Timer',
    actor: 'system',
    activity: 'timer',
    icon: Clock,
    defaults: {
      title: 'Wait',
      text: 'Keep working. AI is intentionally paused.',
      durationSeconds: 180,
    },
  },
  generate: {
    label: 'AI final answer',
    actor: 'ai',
    activity: 'generate',
    icon: Bot,
    defaults: {
      title: 'Worked explanation',
      text: 'Generate a final worked explanation after the learner has tried.',
    },
  },
};

const INITIAL_NODES = [
  makeNode('display'),
  makeNode('write'),
  makeNode('feedback'),
  makeNode('generate'),
];

function makeNode(type) {
  const definition = NODE_TYPES[type];
  return {
    id: uid(),
    type,
    ...definition.defaults,
  };
}

function variableNameFor(node, index) {
  if (node.type === 'write') return `response${index + 1}`;
  if (node.type === 'feedback') return `feedback${index + 1}`;
  if (node.type === 'generate') return 'finalAnswer';
  return null;
}

function latestWriteVariable(nodes, index) {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (nodes[i].type === 'write') return variableNameFor(nodes[i], i);
  }
  return null;
}

function stepForNode(node, index, nodes) {
  const definition = NODE_TYPES[node.type];
  const output = variableNameFor(node, index);
  const base = {
    id: `node-${index + 1}`,
    actor: definition.actor,
    activity: definition.activity,
  };

  if (node.type === 'display') {
    return {
      ...base,
      instruction: node.title,
      configuration: { message: node.text },
    };
  }

  if (node.type === 'write') {
    return {
      ...base,
      instruction: node.text,
      validation: { minCharacters: Number(node.minCharacters) },
      output,
    };
  }

  if (node.type === 'timer') {
    return {
      ...base,
      instruction: node.title,
      configuration: {
        message: node.text,
        durationSeconds: Number(node.durationSeconds),
      },
    };
  }

  const responseVariable = latestWriteVariable(nodes, index);
  return {
    ...base,
    instruction: node.title,
    skill: node.type === 'generate' ? 'final_answer' : 'draft_feedback',
    configuration: { prompt: node.text },
    inputs: {
      problem: '{{inputs.problem}}',
      ...(responseVariable ? { response: `{{vars.${responseVariable}}}` } : {}),
    },
    output,
  };
}

function buildWorkflow(name, nodes) {
  const steps = nodes.map(stepForNode);
  const variables = {};
  steps.forEach((step) => {
    if (step.output) variables[step.output] = null;
  });

  return {
    id: uid(),
    name,
    kind: 'custom',
    description: 'A custom visual learning workflow.',
    inputs: ['problem'],
    variables,
    steps,
    outputs: variables.finalAnswer ? { answer: '{{vars.finalAnswer}}' } : {},
  };
}

function updateNode(nodes, nodeId, patch) {
  return nodes.map((node) => (node.id === nodeId ? { ...node, ...patch } : node));
}

function moveNode(nodes, index, direction) {
  const target = index + direction;
  if (target < 0 || target >= nodes.length) return nodes;
  const next = [...nodes];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/**
 * Visual node-style workflow editor. The saved artifact remains a plain
 * activity-driven workflow so the runtime does not need builder-specific
 * logic.
 */
export function WorkflowBuilder({ persist, onSaved }) {
  const [name, setName] = useState('My study workflow');
  const [nodes, setNodes] = useState(INITIAL_NODES);

  const workflow = useMemo(() => buildWorkflow(name, nodes), [name, nodes]);
  const errors = useMemo(() => validateWorkflow(workflow), [workflow]);

  function addNode(type) {
    setNodes((current) => [...current, makeNode(type)]);
  }

  function handleSave() {
    if (errors.length > 0) return;
    persist((draft) => draft.workflows.push(workflow));
    onSaved(workflow);
  }

  return (
    <section className="panel workflow-editor">
      <h2>Create a workflow</h2>
      <input value={name} onChange={(event) => setName(event.target.value)} aria-label="Workflow name" />

      <div className="node-toolbar" aria-label="Add workflow activity">
        {Object.entries(NODE_TYPES).map(([type, definition]) => {
          const Icon = definition.icon;
          return (
            <button key={type} type="button" className="secondary" onClick={() => addNode(type)}>
              <Plus size={14} /> <Icon size={15} /> {definition.label}
            </button>
          );
        })}
      </div>

      <ol className="dag-editor" aria-label="Workflow graph">
        {nodes.map((node, index) => {
          const definition = NODE_TYPES[node.type];
          const Icon = definition.icon;
          return (
            <li key={node.id} className={`dag-node ${node.type}`}>
              <div className="node-heading">
                <span><Icon size={16} /> {definition.label}</span>
                <div>
                  <button type="button" className="icon-button" onClick={() => setNodes((current) => moveNode(current, index, -1))} aria-label={`Move ${definition.label} up`} disabled={index === 0}>
                    <ArrowUp size={14} />
                  </button>
                  <button type="button" className="icon-button" onClick={() => setNodes((current) => moveNode(current, index, 1))} aria-label={`Move ${definition.label} down`} disabled={index === nodes.length - 1}>
                    <ArrowDown size={14} />
                  </button>
                  <button type="button" className="icon-button danger" onClick={() => setNodes((current) => current.filter((item) => item.id !== node.id))} aria-label={`Remove ${definition.label}`}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {node.type !== 'write' && (
                <label>
                  Label
                  <input value={node.title} onChange={(event) => setNodes((current) => updateNode(current, node.id, { title: event.target.value }))} />
                </label>
              )}

              <label>
                {node.type === 'write' ? 'Instruction for user to respond' : node.type === 'feedback' || node.type === 'generate' ? 'What to ask AI' : 'What system says'}
                <textarea value={node.text} onChange={(event) => setNodes((current) => updateNode(current, node.id, { text: event.target.value }))} />
              </label>

              {node.type === 'write' && (
                <label>
                  Minimum characters
                  <input
                    type="number"
                    min={MIN_CHARACTERS_FLOOR}
                    max={MIN_CHARACTERS_CEILING}
                    value={node.minCharacters}
                    onChange={(event) => setNodes((current) => updateNode(current, node.id, { minCharacters: event.target.value }))}
                  />
                </label>
              )}

              {node.type === 'timer' && (
                <label>
                  Timer seconds
                  <input
                    type="number"
                    min={60}
                    max={3600}
                    value={node.durationSeconds}
                    onChange={(event) => setNodes((current) => updateNode(current, node.id, { durationSeconds: event.target.value }))}
                  />
                </label>
              )}
            </li>
          );
        })}
      </ol>

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
