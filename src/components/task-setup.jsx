import { useState } from 'react';
import { FileText, Lock, Send, Upload, X } from 'lucide-react';
import { WorkflowPicker } from './workflow-picker';

const MAX_FILE_SIZE = 1024 * 1024;
const TEXT_FILE_TYPES = ['text/plain', 'text/markdown', 'application/json', 'text/csv'];

function supportsText(file) {
  return TEXT_FILE_TYPES.includes(file.type) || /\.(txt|md|markdown|csv|json)$/i.test(file.name);
}

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
  fileInput,
  onFileInputChange,
  hasReadyConnection,
  onStart,
}) {
  const [fileError, setFileError] = useState('');
  const acceptsFile = selectedWorkflow?.kind === 'custom';
  const canStart = (task.trim().length > 0 || (acceptsFile && fileInput)) && hasReadyConnection;

  async function handleFileChange(event) {
    const [file] = event.target.files;
    setFileError('');
    if (!file) return;
    if (!supportsText(file)) return setFileError('Choose a text, Markdown, CSV, or JSON file.');
    if (file.size > MAX_FILE_SIZE) return setFileError('Choose a file smaller than 1 MB.');
    try {
      onFileInputChange({ name: file.name, content: await file.text() });
    } catch {
      setFileError('That file could not be read. Please try another file.');
    }
  }

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

      {acceptsFile && (
        <div className="file-input">
          <div>
            <h2>Bring your source material</h2>
            <p>Custom workflows can start from a text, Markdown, CSV, or JSON file (up to 1 MB).</p>
          </div>
          {!fileInput ? (
            <label className="file-picker">
              <Upload size={16} /> Choose a file
              <input type="file" accept=".txt,.md,.markdown,.csv,.json,text/plain,text/markdown,text/csv,application/json" onChange={handleFileChange} />
            </label>
          ) : (
            <div className="selected-file">
              <FileText size={17} /> <span>{fileInput.name}</span>
              <button type="button" onClick={() => onFileInputChange(null)} aria-label="Remove attached file"><X size={15} /></button>
            </div>
          )}
          {fileError && <p className="error">{fileError}</p>}
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
