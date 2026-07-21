import { useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Bot, Clock, MessageSquare, Plus, Trash2, Upload, UserRound } from 'lucide-react';
import { getBuilderNodeTypes } from '../workflows/workflow-model';
import { validateWorkflow } from '../workflows/validate-workflow';
import { parseWorkflowText, workflowToMarkdown } from '../utils/export-text';
import { uid } from '../utils/uid';
import { MIN_CHARACTERS_FLOOR, MIN_CHARACTERS_CEILING, DEFAULT_MIN_CHARACTERS, DEFAULT_FREEZE_SECONDS, DEFAULT_REASK_LIMIT } from '../constants';
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

function buildWorkflow(name, nodes, workflowId = uid()) {
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
    id: workflowId,
    name,
    kind: 'custom',
    description: 'A custom visual learning workflow.',
    inputs: ['problem'],
    variables,
    steps,
    outputs,
    configuration: {
      reaskEnabled: true,
      reaskLimit: DEFAULT_REASK_LIMIT,
    },
  };
}

function nodeFromStep(step) {
  const activity = step?.activity ?? step?.type;
  const type = activity === 'display' || activity === 'write' || activity === 'feedback' || activity === 'generate' || activity === 'timer'
    ? activity
    : 'display';
  const definition = NODE_TYPES[type] ?? NODE_TYPES.display;
  const defaults = definition.defaults ?? {};

  if (type === 'display') {
    return {
      id: uid(),
      type,
      ...defaults,
      title: step?.instruction || defaults.title,
      text: step?.configuration?.message || step?.instruction || defaults.text,
    };
  }

  if (type === 'write') {
    return {
      id: uid(),
      type,
      ...defaults,
      title: defaults.title,
      text: step?.instruction || defaults.text,
      minCharacters: step?.validation?.minCharacters ?? defaults.minCharacters ?? DEFAULT_MIN_CHARACTERS,
    };
  }

  if (type === 'timer') {
    return {
      id: uid(),
      type,
      ...defaults,
      title: step?.instruction || defaults.title,
      text: step?.configuration?.message || defaults.text,
      durationSeconds: step?.configuration?.durationSeconds ?? defaults.durationSeconds ?? DEFAULT_FREEZE_SECONDS,
    };
  }

  return {
    id: uid(),
    type,
    ...defaults,
    title: step?.instruction || defaults.title,
    text: step?.configuration?.prompt || step?.instruction || defaults.text,
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
  const inputRef = useRef(null);
  const [name, setName] = useState('My study workflow');
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [workflowId, setWorkflowId] = useState(() => uid());
  const [importError, setImportError] = useState('');

  const workflow = useMemo(() => buildWorkflow(name, nodes, workflowId), [name, nodes, workflowId]);
  const errors = useMemo(() => validateWorkflow(workflow), [workflow]);

  function addNode(type) {
    setNodes((current) => [...current, makeNode(type)]);
  }

  function handleSave() {
    if (errors.length > 0) return;
    persist((draft) => draft.workflows.push(workflow));
    onSaved(workflow);
  }

  function handleImportWorkflow(event) {
    const [file] = event.target.files || [];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const importedWorkflow = parseWorkflowText(reader.result);
        setName(importedWorkflow.name || 'Imported workflow');
        setWorkflowId(importedWorkflow.id || uid());
        setNodes((importedWorkflow.steps || []).map(nodeFromStep));
        setImportError('');
      } catch (error) {
        setImportError(error.message || 'Unable to import workflow.');
      }
    };
    reader.onerror = () => {
      setImportError('Unable to read the selected workflow file.');
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  const markdownExport = useMemo(() => workflowToMarkdown(workflow), [workflow]);

  function downloadYaml() {
    const filename = `${workflow.name ? workflow.name.replace(/\s+/g, '_') : 'workflow'}.md`;
    const blob = new Blob([markdownExport], { type: 'text/markdown;charset=utf-8' });
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <input value={name} onChange={(event) => setName(event.target.value)} aria-label="Workflow name" />
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="secondary" onClick={() => inputRef.current?.click()}>
            <Upload size={14} /> Import workflow
          </button>
          <input ref={inputRef} type="file" accept=".md,.markdown,.txt,.yaml,.yml,text/plain,text/markdown" aria-label="Import workflow" onChange={handleImportWorkflow} style={{ display: 'none' }} />
        </div>
      </div>
      {importError ? <p className="error">{importError}</p> : null}

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
        <h3>Export Markdown</h3>
        <div className="export-card">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8}}>
            <pre style={{margin:0,flex:1,overflow:'auto'}}>{markdownExport}</pre>
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
