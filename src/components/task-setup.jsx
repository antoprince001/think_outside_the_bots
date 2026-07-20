import { Lock, Send } from 'lucide-react';
import { WorkflowPicker } from './workflow-picker';

/**
 * The pre-session screen: the student states their task, picks a workflow,
 * sees the provider-data-use disclosure, and starts once a tested model
 * connection is selected.
 */
export function TaskSetup({
  task,
  onTaskChange,
  workflows,
  selectedWorkflowId,
  onSelectWorkflow,
  hasReadyConnection,
  onStart,
}) {
  const canStart = task.trim().length > 0 && hasReadyConnection;

  return (
    <section className="setup">
      <span className="eyebrow">LEARN BEFORE YOU ASK</span>
      <h1>
        Build your conviction
        <br />
        <em>before the answer.</em>
      </h1>
      <p>Choose a workflow that creates useful friction, then let AI respond to your thinking.</p>

      <textarea
        aria-label="Learning task"
        value={task}
        onChange={(event) => onTaskChange(event.target.value)}
        placeholder="What are you working through?"
        maxLength={5000}
      />

      <h2>Pick your path</h2>
      <WorkflowPicker
        workflows={workflows}
        selectedId={selectedWorkflowId}
        onSelect={onSelectWorkflow}
      />

      <div className="notice">
        <Lock size={16} />
        Your selected provider receives only the task and work needed for feedback. Your API key
        stays in this browser session.
      </div>

      <button type="button" className="primary" disabled={!canStart} onClick={onStart}>
        Start learning <Send size={16} />
      </button>

      {!hasReadyConnection && <p className="hint">Add and test a model connection to begin.</p>}
    </section>
  );
}
