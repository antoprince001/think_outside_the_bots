import { Lock, Send } from 'lucide-react';
import { WORKFLOW_APPROACH_DEFINITIONS, WORKFLOW_STRATEGY_MODES } from '../workflows/workflow-model';
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
  workflowStrategy,
  onStrategyModeChange,
  onStrategyApproachToggle,
  onSelectionPromptChange,
  hasReadyConnection,
  onStart,
}) {
  const allowsTimerChoice = selectedWorkflow?.id === 'freeze';
  const hasStrategySelection = (workflowStrategy?.strategyMode === 'multiple' || workflowStrategy?.strategyMode === 'adaptive')
    ? (workflowStrategy?.selectedWorkflowIds?.length ?? 0) > 0
    : true;
  const hasSelectionPrompt = workflowStrategy?.strategyMode === 'adaptive'
    ? (workflowStrategy?.selectionPrompt ?? '').trim().length > 0
    : true;
  const canStart = task.trim().length > 0 && hasReadyConnection && hasStrategySelection && hasSelectionPrompt;

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

      <div className="strategy-card" style={{ border: '1px solid #d7dce5', borderRadius: 12, padding: 12, marginTop: 8, marginBottom: 8, background: '#f7f9fc' }}>
        <label htmlFor="workflow-strategy-mode">Learning mode</label>
        <select id="workflow-strategy-mode" value={workflowStrategy?.strategyMode ?? 'single'} onChange={(event) => onStrategyModeChange?.(event.target.value)} aria-label="Learning mode">
          {WORKFLOW_STRATEGY_MODES.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
        <p className="flow-hint" role="note" style={{ marginTop: 8 }}>
          {workflowStrategy?.strategyMode === 'multiple'
            ? 'Pick several workflows to combine into one path.'
            : workflowStrategy?.strategyMode === 'adaptive'
              ? 'Pick a few starting workflows and let AI choose the next path during the session.'
              : 'Choose one workflow to guide the session.'}
        </p>
      </div>

      <h2>Pick your path</h2>
      <WorkflowPicker
        workflows={workflows}
        selectedId={selectedWorkflowId}
        selectedIds={workflowStrategy?.selectedWorkflowIds ?? []}
        mode={workflowStrategy?.strategyMode ?? 'single'}
        onSelect={onSelectWorkflow}
        onDelete={onDeleteWorkflow}
        onExport={onExportWorkflow}
      />

      {workflowStrategy?.strategyMode === 'adaptive' && (
        <div className="strategy-card" style={{ border: '1px solid #d7dce5', borderRadius: 12, padding: 12, marginTop: 12, background: '#f7f9fc' }}>
          <strong>Adaptive guidance</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {WORKFLOW_APPROACH_DEFINITIONS.map((approach) => (
              <label key={approach.id} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #cbd5e1', borderRadius: 999, padding: '6px 10px', background: '#fff' }}>
                <input type="checkbox" aria-label={`Include ${approach.label}`} checked={(workflowStrategy?.approaches ?? []).includes(approach.id)} onChange={() => onStrategyApproachToggle?.(approach.id)} />
                {approach.label}
              </label>
            ))}
          </div>
          <label htmlFor="workflow-selection-prompt" style={{ display: 'block', marginTop: 8 }}>
            How should AI choose the next path?
            <textarea id="workflow-selection-prompt" value={workflowStrategy?.selectionPrompt ?? ''} onChange={(event) => onSelectionPromptChange?.(event.target.value)} placeholder="Example: start with Feynman, then pivot to Socratic if the learner is stuck." />
          </label>
        </div>
      )}

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

      {!hasStrategySelection && <p className="hint">Pick at least one approach before starting a hybrid or dynamic workflow.</p>}
      {!hasSelectionPrompt && <p className="hint">Add a short selection prompt so AI can choose approaches dynamically.</p>}

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
