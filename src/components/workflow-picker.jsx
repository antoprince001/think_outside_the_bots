/**
 * Renders the grid of selectable workflows (prebuilt + saved custom ones).
 * Purely presentational: selection state and the workflow list itself live
 * in the parent.
 */
export function WorkflowPicker({ workflows, selectedId, onSelect }) {
  return (
    <div className="mode-grid" role="radiogroup" aria-label="Learning workflow">
      {workflows.map((workflow) => (
        <button
          key={workflow.id}
          type="button"
          role="radio"
          aria-checked={selectedId === workflow.id}
          className={`mode-card ${selectedId === workflow.id ? 'selected' : ''}`}
          onClick={() => onSelect(workflow.id)}
        >
          <strong>{workflow.name}</strong>
          <span>{workflow.description}</span>
        </button>
      ))}
    </div>
  );
}
