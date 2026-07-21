import { Download, Trash2 } from 'lucide-react';

/**
 * Renders the grid of selectable workflows (prebuilt + saved custom ones).
 * Purely presentational: selection state and the workflow list itself live
 * in the parent.
 */
export function WorkflowPicker({ workflows, selectedId, onSelect, onDelete, onExport }) {
  return (
    <div className="mode-grid" role="radiogroup" aria-label="Learning workflow">
      {workflows.map((workflow) => (
        <div
          key={workflow.id}
          className={`mode-card ${selectedId === workflow.id ? 'selected' : ''}`}
        >
          <button
            type="button"
            role="radio"
            aria-checked={selectedId === workflow.id}
            className="mode-select"
            onClick={() => onSelect(workflow.id)}
          >
            <strong>{workflow.name}</strong>
            <span>{workflow.description}</span>
          </button>
          {workflow.kind === 'custom' && (
            <div className="mode-actions" aria-label={`${workflow.name} actions`}>
              <button type="button" className="icon-button" onClick={() => onExport?.(workflow)} aria-label={`Export ${workflow.name}`}>
                <Download size={15} />
              </button>
              <button type="button" className="icon-button danger" onClick={() => onDelete?.(workflow.id)} aria-label={`Delete ${workflow.name}`}>
                <Trash2 size={15} />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
