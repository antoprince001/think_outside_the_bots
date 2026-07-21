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
import { downloadTextFile, safeFilename, workflowToYaml } from './utils/export-text';
import './styles.css';

const CLOCK_TICK_MS = 1000;
const DEFAULT_FREEZE_SECONDS = 180;

function buildCombinedWorkflow(workflows, strategyState) {
  const selectedWorkflows = (strategyState?.selectedWorkflowIds ?? [])
    .map((workflowId) => workflows.find((workflow) => workflow.id === workflowId))
    .filter(Boolean);

  if (selectedWorkflows.length <= 1) {
    return selectedWorkflows[0] ?? workflows[0] ?? null;
  }

  const combinedSteps = [];
  const combinedVariables = {};
  const workflowLabels = [];

  selectedWorkflows.forEach((workflow, workflowIndex) => {
    const slug = String(workflow.name || workflow.id || `workflow-${workflowIndex + 1}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `workflow-${workflowIndex + 1}`;
    const outputNames = new Map();

    (workflow.steps ?? []).forEach((step) => {
      const nextStep = structuredClone(step);
      const originalOutput = nextStep.output;
      if (originalOutput) {
        const renamedOutput = `${slug}-${originalOutput}`;
        outputNames.set(originalOutput, renamedOutput);
        nextStep.output = renamedOutput;
      }

      if (nextStep.inputs && typeof nextStep.inputs === 'object') {
        Object.entries(nextStep.inputs).forEach(([key, value]) => {
          if (typeof value === 'string') {
            nextStep.inputs[key] = value.replace(/\{\{\s*vars\.([A-Za-z0-9_-]+)\s*\}\}/g, (_match, varName) => `{{vars.${outputNames.get(varName) ?? varName}}}`);
          }
        });
      }

      combinedSteps.push(nextStep);
    });

    workflowLabels.push(workflow.name || workflow.id);
  });

  combinedSteps.forEach((step) => {
    if (step.output) combinedVariables[step.output] = null;
  });

  const finalStep = [...combinedSteps].reverse().find((step) => step.output);
  return {
    id: `combined-${Date.now()}`,
    name: workflowLabels.join(' + '),
    kind: 'custom',
    description: 'A combined workflow built from multiple paths.',
    inputs: ['problem'],
    variables: combinedVariables,
    steps: combinedSteps,
    outputs: finalStep ? { answer: `{{vars.${finalStep.output}}}` } : {},
    configuration: {
      reaskEnabled: true,
      reaskLimit: 3,
      strategyMode: strategyState?.strategyMode ?? 'multiple',
      selectionPrompt: strategyState?.selectionPrompt ?? '',
      workflowIds: (strategyState?.selectedWorkflowIds ?? []).filter(Boolean),
    },
  };
}

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

  function startSession() {
    if (!task.trim() || !hasReadyConnection) return;
    const workflow = selectedWorkflow.id === 'freeze'
      ? withTimerDuration(selectedWorkflow, freezeDurationSeconds)
      : selectedWorkflow;
    const selectedWorkflowIds = (workflowStrategy.selectedWorkflowIds ?? []).filter(Boolean);
    const resolvedWorkflow = (workflowStrategy.strategyMode === 'multiple' || workflowStrategy.strategyMode === 'adaptive')
      ? buildCombinedWorkflow(workflows, { ...workflowStrategy, selectedWorkflowIds: selectedWorkflowIds.length > 0 ? selectedWorkflowIds : [selectedWorkflow.id] })
      : workflow;
    const configuredWorkflow = {
      ...resolvedWorkflow,
      configuration: {
        ...(resolvedWorkflow.configuration ?? {}),
        reaskEnabled: true,
        reaskLimit: 3,
        strategyMode: workflowStrategy.strategyMode,
        workflowIds: selectedWorkflowIds.length > 0 ? selectedWorkflowIds : [selectedWorkflow.id],
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
