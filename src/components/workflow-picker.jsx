import { Download, Trash2 } from 'lucide-react';

function workflowSummary(workflow) {
  const description = workflow?.description ? String(workflow.description) : '';
  const strategyMode = workflow?.configuration?.strategyMode ?? 'single';
  const approaches = Array.isArray(workflow?.configuration?.approaches) ? workflow.configuration.approaches : [];

  if (strategyMode === 'single') return description;
  const label = strategyMode === 'adaptive' ? 'Adaptive path' : strategyMode === 'multiple' ? 'Multiple paths' : 'Hybrid mix';
  const detail = approaches.length > 0 ? ` • ${approaches.join(', ')}` : '';
  return `${description}${description ? ' • ' : ''}${label}${detail}`;
}

/**
 * Renders the grid of selectable workflows (prebuilt + saved custom ones).
 * Purely presentational: selection state and the workflow list itself live
 * in the parent.
 */
export function WorkflowPicker({ workflows, selectedId, selectedIds = [], mode = 'single', onSelect, onDelete, onExport }) {
  const isMultiMode = mode === 'multiple' || mode === 'adaptive';
  const selectionState = (workflowId) => {
    if (isMultiMode) return selectedIds.includes(workflowId);
    return selectedId === workflowId;
  };

  return (
    <div className="mode-grid" role={isMultiMode ? 'group' : 'radiogroup'} aria-label="Learning workflow">
      {workflows.map((workflow) => {
        const isSelected = selectionState(workflow.id);
        return (
          <div
            key={workflow.id}
            className={`mode-card ${isSelected ? 'selected' : ''}`}
          >
            <button
              type="button"
              role={isMultiMode ? 'checkbox' : 'radio'}
              aria-checked={isSelected}
              className="mode-select"
              onClick={() => onSelect?.(workflow.id)}
            >
              <strong>{workflow.name}</strong>
              <span>{workflowSummary(workflow)}</span>
            </button>
            <div className="mode-actions" aria-label={`${workflow.name} actions`}>
              <button type="button" className="icon-button" onClick={() => onExport?.(workflow)} aria-label={`Export ${workflow.name}`}>
                <Download size={15} />
              </button>
              {workflow.kind === 'custom' && (
                <button type="button" className="icon-button danger" onClick={() => onDelete?.(workflow.id)} aria-label={`Delete ${workflow.name}`}>
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
