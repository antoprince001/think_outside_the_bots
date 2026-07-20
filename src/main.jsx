import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Brain, KeyRound, LayoutList, Menu, Plus, X } from 'lucide-react';
import { HomePage } from './components/home-page';
import { ModelConnections } from './components/model-connections';
import { SessionReview } from './components/session-review';
import { SessionShell } from './components/session-shell';
import { TaskSetup } from './components/task-setup';
import { WorkflowBuilder } from './components/workflow-builder';
import { getKey } from './services/credential-store';
import { load, update } from './services/local-store';
import { createSession } from './workflows/session-machine';
import { presets } from './workflows/presets';
import { withTimerDuration } from './workflows/workflow-model';
import './styles.css';

const CLOCK_TICK_MS = 1000;
const DEFAULT_FREEZE_SECONDS = 180;

function useClock() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => clearInterval(intervalId);
  }, []);
  return now;
}

function App() {
  const [store, setStore] = useState(load);
  const [task, setTask] = useState('');
  const [fileInput, setFileInput] = useState(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(presets[0].id);
  const [freezeDurationSeconds, setFreezeDurationSeconds] = useState(DEFAULT_FREEZE_SECONDS);
  const [session, setSession] = useState(null);
  const [activePanel, setActivePanel] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const now = useClock();

  const workflows = useMemo(() => [...presets, ...store.workflows], [store.workflows]);
  const selectedWorkflow = workflows.find((w) => w.id === selectedWorkflowId) ?? presets[0];
  const selectedConnection = store.connections.find((c) => c.id === store.selectedConnection);
  const hasReadyConnection = Boolean(selectedConnection && getKey(selectedConnection.id));

  const persist = (mutator) => setStore(update(mutator));

  function saveSession(nextSession) {
    setSession(nextSession);
    persist((draft) => {
      const index = draft.sessions.findIndex((s) => s.id === nextSession.id);
      if (index >= 0) draft.sessions[index] = nextSession;
    });
  }

  function startSession() {
    const hasTaskInput = task.trim() || (selectedWorkflow.kind === 'custom' && fileInput);
    if (!hasTaskInput || !hasReadyConnection) return;
    const taskWithFile = fileInput && selectedWorkflow.kind === 'custom'
      ? `${task.trim() ? `${task.trim()}\n\n` : ''}Attached file: ${fileInput.name}\n\n${fileInput.content}`
      : task.trim();
    const workflow = selectedWorkflow.id === 'freeze'
      ? withTimerDuration(selectedWorkflow, freezeDurationSeconds)
      : selectedWorkflow;
    const newSession = createSession({
      task: taskWithFile,
      workflow,
      connection: selectedConnection,
    });
    persist((draft) => draft.sessions.unshift(newSession));
    setSession(newSession);
  }

  function handleWorkflowSaved(workflow) {
    setSelectedWorkflowId(workflow.id);
    setActivePanel('setup');
  }

  function handleSelectWorkflow(workflowId) {
    setSelectedWorkflowId(workflowId);
    if (workflows.find((workflow) => workflow.id === workflowId)?.kind !== 'custom') setFileInput(null);
  }

  return (
    <div className="app-shell">
      {!isSidebarOpen && (
        <button type="button" className="menu-toggle" onClick={() => setIsSidebarOpen(true)} aria-label="Open navigation menu">
          <Menu size={21} />
        </button>
      )}
      {isSidebarOpen && <aside className="sidebar">
        <div className="sidebar-heading">
          <button type="button" className="brand" onClick={() => setActivePanel('home')} aria-label="Go to home page">
            <Brain size={20} /> Think Outside The Bots
          </button>
          <button type="button" className="menu-toggle" onClick={() => setIsSidebarOpen(false)} aria-label="Close navigation menu">
            <X size={20} />
          </button>
        </div>
        <nav aria-label="Application navigation">
          <button type="button" className={activePanel === 'setup' ? 'active' : ''} onClick={() => setActivePanel('setup')}>
            <LayoutList size={16} /> Learning space
          </button>
          <button type="button" className={activePanel === 'models' ? 'active' : ''} onClick={() => setActivePanel('models')}>
            <KeyRound size={16} /> Models
          </button>
          <button type="button" className={activePanel === 'workflow' ? 'active' : ''} onClick={() => setActivePanel('workflow')}>
            <Plus size={16} /> Custom workflow
          </button>
        </nav>
      </aside>}

      <main>
        {activePanel === 'home' && <HomePage onGetStarted={() => setActivePanel('setup')} />}
        {activePanel === 'models' && <ModelConnections store={store} persist={persist} />}
        {activePanel === 'workflow' && <WorkflowBuilder persist={persist} onSaved={handleWorkflowSaved} />}

        {!session && activePanel === 'setup' && (
          <TaskSetup
            task={task}
            onTaskChange={setTask}
            workflows={workflows}
            selectedWorkflowId={selectedWorkflowId}
            selectedWorkflow={selectedWorkflow}
            onSelectWorkflow={handleSelectWorkflow}
            freezeDurationSeconds={freezeDurationSeconds}
            onFreezeDurationChange={setFreezeDurationSeconds}
            fileInput={fileInput}
            onFileInputChange={setFileInput}
            hasReadyConnection={hasReadyConnection}
            onStart={startSession}
          />
        )}

        {session && activePanel === 'setup' && session.status !== 'complete' && (
          <SessionShell
            session={session}
            onSessionChange={saveSession}
            connections={store.connections}
            now={now}
            onExit={() => setSession(null)}
          />
        )}

        {session && activePanel === 'setup' && session.status === 'complete' && (
          <SessionReview session={session} onExit={() => setSession(null)} />
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
