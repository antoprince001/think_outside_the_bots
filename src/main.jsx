import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Brain, KeyRound, LayoutList, Menu, Plus, X } from 'lucide-react';
import { HomePage } from './components/home-page';
import { LoginScreen } from './components/login-screen';
import { ModelConnections } from './components/model-connections';
import { SessionReview } from './components/session-review';
import { SessionShell } from './components/session-shell';
import { TaskSetup } from './components/task-setup';
import { WorkflowBuilder } from './components/workflow-builder';
import { getKey } from './services/credential-store';
import { authConfigured, isLoggedIn, login, logout } from './services/auth-store';
import { load, update } from './services/local-store';
import { suggestAdaptiveWorkflowSequence } from './services/provider-adapter';
import { createSession } from './workflows/session-machine';
import { presets } from './workflows/presets';
import { withTimerDuration } from './workflows/workflow-model';
import { buildCombinedWorkflow } from './workflows/combine-workflows';
import { downloadTextFile, safeFilename, workflowToYaml } from './utils/export-text';
import './styles.css';
import { CLOCK_TICK_MS, DEFAULT_FREEZE_SECONDS, DEFAULT_REASK_LIMIT, ICON_SIZE_LARGE, ICON_SIZE_MEDIUM, ICON_SIZE_SMALL } from './constants';

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
  const [freezeDurationSeconds, setFreezeDurationSeconds] = useState(DEFAULT_FREEZE_SECONDS);
  const [workflowStrategy, setWorkflowStrategy] = useState({ strategyMode: 'single', selectedWorkflowIds: [presets[0].id], approaches: [], selectionPrompt: '' });
  const [session, setSession] = useState(null);
  const [activePanel, setActivePanel] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(isLoggedIn());
  const now = useClock();

  const workflows = useMemo(() => [...presets, ...store.workflows], [store.workflows]);
  const selectedWorkflow = workflows.find((w) => w.id === selectedWorkflowId) ?? presets[0];
  const selectedConnection = store.connections.find((c) => c.id === store.selectedConnection);
  const hasReadyConnection = Boolean(selectedConnection && getKey(selectedConnection.id));

  const persist = (mutator) => setStore(update(mutator));

  useEffect(() => {
    setWorkflowStrategy((current) => {
      if (current.strategyMode !== 'single') return current;
      if (current.selectedWorkflowIds.includes(selectedWorkflowId)) return current;
      return { ...current, selectedWorkflowIds: [selectedWorkflowId] };
    });
  }, [selectedWorkflowId]);

  function saveSession(nextSession) {
    setSession(nextSession);
    persist((draft) => {
      const index = draft.sessions.findIndex((s) => s.id === nextSession.id);
      if (index >= 0) draft.sessions[index] = nextSession;
    });
  }

  async function startSession() {
    if (!task.trim() || !hasReadyConnection) return;
    const workflow = selectedWorkflow.id === 'freeze'
      ? withTimerDuration(selectedWorkflow, freezeDurationSeconds)
      : selectedWorkflow;
    const selectedWorkflowIds = (workflowStrategy.selectedWorkflowIds ?? []).filter(Boolean);
    const fallbackWorkflowIds = selectedWorkflowIds.length > 0 ? selectedWorkflowIds : [selectedWorkflow.id];
    let orderedWorkflowIds = fallbackWorkflowIds;

    if (workflowStrategy.strategyMode === 'adaptive') {
      try {
        orderedWorkflowIds = await suggestAdaptiveWorkflowSequence({
          connection: selectedConnection,
          key: getKey(selectedConnection.id),
          task: task.trim(),
          selectionPrompt: workflowStrategy.selectionPrompt ?? '',
          workflowIds: fallbackWorkflowIds,
          workflows,
        });
      } catch {
        orderedWorkflowIds = fallbackWorkflowIds;
      }
    }

    const resolvedWorkflow = (workflowStrategy.strategyMode === 'multiple' || workflowStrategy.strategyMode === 'adaptive')
      ? buildCombinedWorkflow(workflows, { ...workflowStrategy, selectedWorkflowIds: orderedWorkflowIds, freezeDurationSeconds })
      : workflow;
    const configuredWorkflow = {
      ...resolvedWorkflow,
      configuration: {
        ...(resolvedWorkflow.configuration ?? {}),
          reaskEnabled: true,
          reaskLimit: DEFAULT_REASK_LIMIT,
        strategyMode: workflowStrategy.strategyMode,
        workflowIds: orderedWorkflowIds,
        approaches: workflowStrategy.strategyMode === 'adaptive' ? workflowStrategy.approaches : [],
        selectionPrompt: workflowStrategy.strategyMode === 'adaptive' ? workflowStrategy.selectionPrompt : '',
      },
    };
    const newSession = createSession({
      task: task.trim(),
      workflow: configuredWorkflow,
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
    setWorkflowStrategy((current) => {
      if (current.strategyMode === 'single') {
        return { ...current, selectedWorkflowIds: [workflowId] };
      }
      const nextSelection = current.selectedWorkflowIds.includes(workflowId)
        ? current.selectedWorkflowIds.filter((item) => item !== workflowId)
        : [...current.selectedWorkflowIds, workflowId];
      return { ...current, selectedWorkflowIds: nextSelection };
    });
  }

  function handleStrategyModeChange(value) {
    setWorkflowStrategy((current) => ({
      ...current,
      strategyMode: value,
      selectedWorkflowIds: current.selectedWorkflowIds.length > 0 ? current.selectedWorkflowIds : [selectedWorkflowId],
    }));
  }

  function handleStrategyApproachToggle(approachId) {
    setWorkflowStrategy((current) => {
      const nextApproaches = current.approaches.includes(approachId)
        ? current.approaches.filter((item) => item !== approachId)
        : [...current.approaches, approachId];
      return { ...current, approaches: nextApproaches };
    });
  }

  function handleSelectionPromptChange(value) {
    setWorkflowStrategy((current) => ({ ...current, selectionPrompt: value }));
  }

  function handleLogin(username, password) {
    const authenticated = login(username, password);
    setIsAuthenticated(authenticated);
    return authenticated;
  }

  function handleLogout() {
    logout();
    setIsAuthenticated(false);
  }

  function handleConnectionSelect(connectionId) {
    const selectedConnection = store.connections.find((connection) => connection.id === connectionId);
    if (!selectedConnection || !session) return;

    setSession((currentSession) => {
      if (!currentSession || currentSession.id !== session.id) return currentSession;
      return {
        ...currentSession,
        modelSnapshot: {
          id: selectedConnection.id,
          label: selectedConnection.label,
          provider: selectedConnection.provider,
          model: selectedConnection.model,
        },
      };
    });
  }

  function exportWorkflow(workflow) {
    const yaml = workflowToYaml(workflow);
    downloadTextFile({
      filename: `${safeFilename(workflow.name, 'workflow')}.txt`,
      content: yaml,
    });
  }

  function deleteWorkflow(workflowId) {
    persist((draft) => {
      draft.workflows = draft.workflows.filter((workflow) => workflow.id !== workflowId);
    });
    setWorkflowStrategy((current) => ({
      ...current,
      selectedWorkflowIds: current.selectedWorkflowIds.filter((id) => id !== workflowId),
    }));
    if (selectedWorkflowId === workflowId) setSelectedWorkflowId(presets[0].id);
  }

  if (!isAuthenticated) {
    return <LoginScreen authConfigured={authConfigured} onLogin={handleLogin} />;
  }

  return (
    <div className="app-shell">
      {!isSidebarOpen && (
          <button type="button" className="menu-toggle" onClick={() => setIsSidebarOpen(true)} aria-label="Open navigation menu">
          <Menu size={ICON_SIZE_LARGE} />
        </button>
      )}
      {isSidebarOpen && <aside className="sidebar">
        <div className="sidebar-heading">
          <button type="button" className="brand" onClick={() => setActivePanel('home')} aria-label="Go to home page">
            <Brain size={ICON_SIZE_MEDIUM} /> Think Outside The Bots
          </button>
          <button type="button" className="menu-toggle" onClick={() => setIsSidebarOpen(false)} aria-label="Close navigation menu">
            <X size={ICON_SIZE_MEDIUM} />
          </button>
        </div>
        <nav aria-label="Application navigation">
          <button type="button" className={activePanel === 'setup' ? 'active' : ''} onClick={() => setActivePanel('setup')}>
            <LayoutList size={ICON_SIZE_SMALL} /> Learning space
          </button>
          <button type="button" className={activePanel === 'models' ? 'active' : ''} onClick={() => setActivePanel('models')}>
            <KeyRound size={ICON_SIZE_SMALL} /> Models
          </button>
          <button type="button" className={activePanel === 'workflow' ? 'active' : ''} onClick={() => setActivePanel('workflow')}>
            <Plus size={ICON_SIZE_SMALL} /> Custom workflow
          </button>
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <button type="button" className="secondary" onClick={handleLogout} style={{ width: '100%' }}>
            Log out
          </button>
        </div>
      </aside>}

      <main>
        {activePanel === 'home' && <HomePage onGetStarted={() => setActivePanel('setup')} />}
        {activePanel === 'models' && <ModelConnections store={store} persist={persist} onConnectionSelect={handleConnectionSelect} />}
        {activePanel === 'workflow' && <WorkflowBuilder persist={persist} onSaved={handleWorkflowSaved} />}

        {!session && activePanel === 'setup' && (
          <TaskSetup
            task={task}
            onTaskChange={setTask}
            workflows={workflows}
            selectedWorkflowId={selectedWorkflowId}
            selectedWorkflow={selectedWorkflow}
            onSelectWorkflow={handleSelectWorkflow}
            onDeleteWorkflow={deleteWorkflow}
            onExportWorkflow={exportWorkflow}
            freezeDurationSeconds={freezeDurationSeconds}
            onFreezeDurationChange={setFreezeDurationSeconds}
            workflowStrategy={workflowStrategy}
            onStrategyModeChange={handleStrategyModeChange}
            onStrategyApproachToggle={handleStrategyApproachToggle}
            onSelectionPromptChange={handleSelectionPromptChange}
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
