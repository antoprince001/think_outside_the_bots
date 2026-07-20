import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Brain, KeyRound, Plus } from 'lucide-react';
import { ModelConnections } from './components/model-connections';
import { SessionReview } from './components/session-review';
import { SessionShell } from './components/session-shell';
import { TaskSetup } from './components/task-setup';
import { WorkflowBuilder } from './components/workflow-builder';
import { getKey } from './services/credential-store';
import { load, update } from './services/local-store';
import { createSession } from './workflows/session-machine';
import { presets } from './workflows/presets';
import './styles.css';

const CLOCK_TICK_MS = 1000;

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
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(presets[0].id);
  const [session, setSession] = useState(null);
  const [showConnections, setShowConnections] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
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
    if (!task.trim() || !hasReadyConnection) return;
    const newSession = createSession({
      task: task.trim(),
      workflow: selectedWorkflow,
      connection: selectedConnection,
    });
    persist((draft) => draft.sessions.unshift(newSession));
    setSession(newSession);
  }

  function handleWorkflowSaved(workflow) {
    setSelectedWorkflowId(workflow.id);
    setShowBuilder(false);
  }

  return (
    <div className="app-shell">
      <header>
        <div className="brand">
          <Brain size={20} /> Think Outside The Bots
        </div>
        <nav>
          <button type="button" onClick={() => setShowConnections((open) => !open)}>
            <KeyRound size={16} /> Models
          </button>
          <button type="button" onClick={() => setShowBuilder((open) => !open)}>
            <Plus size={16} /> Custom workflow
          </button>
        </nav>
      </header>

      <main>
        {showConnections && <ModelConnections store={store} persist={persist} />}
        {showBuilder && <WorkflowBuilder persist={persist} onSaved={handleWorkflowSaved} />}

        {!session && (
          <TaskSetup
            task={task}
            onTaskChange={setTask}
            workflows={workflows}
            selectedWorkflowId={selectedWorkflowId}
            onSelectWorkflow={setSelectedWorkflowId}
            hasReadyConnection={hasReadyConnection}
            onStart={startSession}
          />
        )}

        {session && session.status !== 'complete' && (
          <SessionShell
            session={session}
            onSessionChange={saveSession}
            connections={store.connections}
            now={now}
            onExit={() => setSession(null)}
          />
        )}

        {session && session.status === 'complete' && <SessionReview session={session} />}
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
