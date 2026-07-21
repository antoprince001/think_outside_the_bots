import { Lock, Send } from 'lucide-react';
import { WorkflowPicker } from './workflow-picker';

const FREEZE_OPTIONS = [
  { label: '1 min', value: 60 },
  { label: '3 min', value: 180 },
  { label: '5 min', value: 300 },
  { label: '10 min', value: 600 },
  { label: '15 min', value: 900 },
];

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
  selectedWorkflow,
  onSelectWorkflow,
  onDeleteWorkflow,
  onExportWorkflow,
  freezeDurationSeconds,
  onFreezeDurationChange,
  hasReadyConnection,
  onStart,
}) {
  const allowsTimerChoice = selectedWorkflow?.id === 'freeze';
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
        onDelete={onDeleteWorkflow}
        onExport={onExportWorkflow}
      />

      {allowsTimerChoice && (
        <div className="timer-choice">
          <h2>Freeze duration</h2>
          <div className="segmented" role="radiogroup" aria-label="AI freeze duration">
            {FREEZE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={freezeDurationSeconds === option.value}
                className={freezeDurationSeconds === option.value ? 'selected' : ''}
                onClick={() => onFreezeDurationChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

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
