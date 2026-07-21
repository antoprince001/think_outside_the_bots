import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Bot, Clock, MessageSquare, Plus, Trash2, UserRound } from 'lucide-react';
import { getBuilderNodeTypes } from '../workflows/workflow-model';
import { validateWorkflow } from '../workflows/validate-workflow';
import { uid } from '../utils/uid';

const MIN_CHARACTERS_FLOOR = 1;
const MIN_CHARACTERS_CEILING = 10000;
const ICON_MAP = {
  MessageSquare,
  UserRound,
  Bot,
  Clock,
};

const NODE_TYPES = Object.fromEntries(
  Object.entries(getBuilderNodeTypes()).map(([type, definition]) => [
    type,
    {
      ...definition,
      icon: ICON_MAP[definition.icon] ?? MessageSquare,
    },
  ]),
);

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

  // Determine the last step that produced an output and expose it as
  // the workflow-level `answer` output so downstream code can always
  // reference `outputs.answer` for the final artifact.
  const lastStepWithOutput = [...steps].slice().reverse().find((s) => s.output);
  const outputs = lastStepWithOutput ? { answer: `{{vars.${lastStepWithOutput.output}}}` } : {};

  return {
    id: uid(),
    name,
    kind: 'custom',
    description: 'A custom visual learning workflow.',
    inputs: ['problem'],
    variables,
    steps,
    outputs,
    configuration: {
      reaskEnabled: true,
      reaskLimit: 3,
    },
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

  const yamlExport = useMemo(() => {
    const lines = [];
    lines.push('version: "1.0.0"');
    lines.push(`id: ${workflow.id}`);
    lines.push(`name: ${workflow.name}`);
    lines.push(`kind: ${workflow.kind}`);
    lines.push(`description: ${workflow.description}`);
    lines.push('inputs:');
    lines.push('  - problem');
    lines.push('variables:');
    Object.entries(workflow.variables).forEach(([key, value]) => {
      lines.push(`  ${key}: ${value === null ? 'null' : value}`);
    });
    lines.push('steps:');
    workflow.steps.forEach((step) => {
      lines.push(`  - id: ${step.id}`);
      lines.push(`    actor: ${step.actor}`);
      lines.push(`    activity: ${step.activity}`);
      if (step.instruction) lines.push(`    instruction: ${step.instruction}`);
      if (step.validation) {
        lines.push('    validation:');
        lines.push(`      minCharacters: ${step.validation.minCharacters}`);
      }
      if (step.configuration && Object.keys(step.configuration).length > 0) {
        lines.push('    configuration:');
        Object.entries(step.configuration).forEach(([key, value]) => {
          lines.push(`      ${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);
        });
      }
      if (step.output) lines.push(`    output: ${step.output}`);
      if (step.skill) lines.push(`    skill: ${step.skill}`);
      if (step.inputs) {
        lines.push('    inputs:');
        Object.entries(step.inputs).forEach(([key, value]) => {
          lines.push(`      ${key}: ${value}`);
        });
      }
    });
    lines.push('outputs:');
    Object.entries(workflow.outputs).forEach(([key, value]) => {
      lines.push(`  ${key}: ${value}`);
    });
    return lines.join('\n');
  }, [workflow]);

  function downloadYaml() {
    const filename = `${workflow.name ? workflow.name.replace(/\s+/g, '_') : 'workflow'}.txt`;
    const blob = new Blob([yamlExport], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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

      <p className="flow-hint" role="note">Flow is read left to right →</p>

      <ol className="dag-editor" aria-label="Workflow graph">
        {nodes.map((node, index) => {
          const definition = NODE_TYPES[node.type];
          const Icon = definition.icon;
          return (
            <li key={node.id} className={`dag-node ${node.type}`}>
              <div className="node-heading">
                <span><span className="node-index">{index + 1}</span><Icon size={16} /> {definition.label}</span>
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
                <div className="field-row">
                  <label htmlFor={`min-${node.id}`}>Minimum characters</label>
                  <input
                    id={`min-${node.id}`}
                    className="small-input"
                    type="number"
                    min={MIN_CHARACTERS_FLOOR}
                    max={MIN_CHARACTERS_CEILING}
                    value={node.minCharacters}
                    onChange={(event) => setNodes((current) => updateNode(current, node.id, { minCharacters: event.target.value }))}
                  />
                </div>
              )}

              {node.type === 'timer' && (
                <div className="field-row">
                  <label htmlFor={`timer-${node.id}`}>Timer seconds</label>
                  <input
                    id={`timer-${node.id}`}
                    className="small-input"
                    type="number"
                    min={60}
                    max={3600}
                    value={node.durationSeconds}
                    onChange={(event) => setNodes((current) => updateNode(current, node.id, { durationSeconds: event.target.value }))}
                  />
                </div>
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

      <div className="export-block">
        <h3>Export YAML</h3>
        <div className="export-card">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8}}>
            <pre style={{margin:0,flex:1,overflow:'auto'}}>{yamlExport}</pre>
            <div style={{marginLeft:8}}>
              <button type="button" className="secondary" onClick={downloadYaml} aria-label="Download workflow as text">
                Download
              </button>
            </div>
          </div>
        </div>
      </div>

      <button type="button" className="primary" disabled={errors.length > 0} onClick={handleSave}>
        Save workflow
      </button>
    </section>
  );
}
