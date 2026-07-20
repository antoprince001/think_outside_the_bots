---
description: "Implementation tasks for Cognitive Learning Workflows"
---

# Tasks: Cognitive Learning Workflows

**Input**: Design documents from `/specs/001-cognitive-workflows/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md,
contracts/client-workflow-contract.md, quickstart.md

**Tests**: Automated tests are required for every behavior change. Write the story tests before the
implementation they verify, use mocked provider calls, and run `pnpm test` and `pnpm build` before
each story checkpoint.

**Organization**: Tasks are grouped by user story so each story produces an independently testable
increment after the shared local-first foundations are complete.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it changes different files and has no unfinished dependency.
- **[Story]**: Identifies the user story served by the task.
- Every task names its exact implementation or test file path.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preserve the React/Vite stack while creating the project structure and deterministic
test environment.

- [ ] T001 Update Vite-compatible test development dependencies and `test` scripts in package.json
- [ ] T002 Configure Vitest, jsdom, React Testing Library setup, and coverage exclusions in vite.config.js and src/test/setup.js
- [ ] T003 [P] Create component, workflow, service, and test directories with module entry points under src/components/, src/workflows/, src/services/, and src/test/
- [ ] T004 [P] Add shared test factories for workflow, session, connection, and provider fixtures in src/test/fixtures.js
- [ ] T005 [P] Add a restrictive browser content-security policy and provider connection allow-list configuration in index.html and src/services/provider-adapter.js

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement the local-first data, credential, provider, and session primitives required by
every workflow.

**⚠️ CRITICAL**: No user-story UI work begins until this phase is complete.

- [ ] T006 [P] Implement safe browser-local persistence, schema versioning, and draft/session recovery helpers in src/services/local-store.js
- [ ] T007 [P] Implement memory and sessionStorage-only API-key storage, masking metadata, replacement, and deletion in src/services/credential-store.js
- [ ] T008 [P] Implement the allow-listed browser provider adapter, request redaction, and generic failure mapping in src/services/provider-adapter.js
- [ ] T009 Define prebuilt Feynman, Socratic, freeze, and long-draft workflow step presets in src/workflows/presets.js
- [ ] T010 Implement workflow sequence validation, learner-gate invariants, and custom-workflow constraints in src/workflows/validate-workflow.js
- [ ] T011 Implement the persisted session state machine, wall-clock freeze calculation, event timeline, and recovery transitions in src/workflows/session-machine.js
- [ ] T012 [P] Add unit tests for local persistence, session-only credential storage, and key redaction in src/test/services/local-store.test.js and src/test/services/credential-store.test.js
- [ ] T013 [P] Add contract tests for allow-listed provider requests, safe failures, and mocked feedback in src/test/services/provider-adapter.test.js
- [ ] T014 Add unit tests for workflow validation, preset rules, state transitions, and reload-safe freeze timing in src/test/workflows/session-machine.test.js and src/test/workflows/validate-workflow.test.js

**Checkpoint**: Shared local-first foundations pass unit and contract tests; all user stories can now
be implemented without exposing a real API key.

---

## Phase 3: User Story 1 - Complete a Guided Learning Task (Priority: P1) 🎯 MVP

**Goal**: A student selects Feynman or Socratic, contributes their reasoning, receives only
permitted mocked AI feedback, and reviews the completed learning path.

**Independent Test**: With a fixture model connection, start a Feynman or Socratic task, prove the
AI control remains locked before contribution, complete each learner gate, receive mocked feedback,
and review the ordered session timeline.

### Tests for User Story 1

- [ ] T015 [P] [US1] Add component tests for task validation, workflow selection, and disabled start state in src/test/components/task-setup.test.jsx
- [ ] T016 [P] [US1] Add integration tests for Feynman and Socratic gate locking, feedback sequencing, and answer rules in src/test/components/session-shell.test.jsx
- [ ] T017 [P] [US1] Add review tests for ordered contributions, feedback, and final-answer visibility in src/test/components/session-review.test.jsx

### Implementation for User Story 1

- [ ] T018 [P] [US1] Build the accessible task prompt, model-selection placeholder, provider-disclosure, and start validation UI in src/components/task-setup.jsx
- [ ] T019 [P] [US1] Build the prebuilt Feynman and Socratic workflow picker with learning-goal descriptions in src/components/workflow-picker.jsx
- [ ] T020 [US1] Build the shared gate panel with contribution progress, locked-AI explanation, feedback display, and final-answer control in src/components/gate-panel.jsx
- [ ] T021 [US1] Build the session shell with setup-to-review progression, saved-work exit state, and state-machine integration in src/components/session-shell.jsx
- [ ] T022 [US1] Build the chronological session review timeline from safe session events in src/components/session-review.jsx
- [ ] T023 [US1] Replace the starter-only interaction in src/main.jsx with the task setup, guided session, and review composition
- [ ] T024 [US1] Extend responsive and accessible workflow styles, visible focus states, empty states, and learning-goal copy in src/styles.css

**Checkpoint**: Feynman and Socratic workflows are independently functional and testable using a
mocked connection; direct answers cannot appear before their configured learner gates.

---

## Phase 4: User Story 2 - Connect a Personal AI Model (Priority: P2)

**Goal**: A student manages a supported personal model connection locally, understands provider
data use, and recovers from an unavailable connection without losing work.

**Independent Test**: Add and explicitly test a mocked valid connection, begin a session using it,
confirm the API key stays masked and session-scoped, force a provider failure, then retry or choose
another model while retaining the task and draft.

### Tests for User Story 2

- [ ] T025 [P] [US2] Add model-connection UI tests for add, mask, replace, delete, disclosure, and unsupported-provider states in src/test/components/model-connections.test.jsx
- [ ] T026 [P] [US2] Add integration tests for provider loading, generic failure, retry, model change, and draft recovery in src/test/components/session-shell.test.jsx
- [ ] T027 [P] [US2] Add a regression test proving keys never enter persisted session records or provider error objects in src/test/services/credential-store.test.js

### Implementation for User Story 2

- [ ] T028 [US2] Build supported model-connection add, test, select, replace, remove, and confirmation controls in src/components/model-connections.jsx
- [ ] T029 [US2] Connect model metadata and session-scoped credentials to task setup and block session start until a valid selection exists in src/components/task-setup.jsx
- [ ] T030 [US2] Add provider loading, generic safe error, retry, and change-model recovery states that preserve drafts in src/components/session-shell.jsx
- [ ] T031 [US2] Apply masked-key, connection-status, disclosure, error, and destructive-action styles in src/styles.css
- [ ] T032 [US2] Wire connection lifecycle and selected-model snapshots into application composition without storing keys in records in src/main.jsx

**Checkpoint**: Personal model connections are locally managed and keys remain session-scoped and
masked; provider failures preserve learner work and offer recovery.

---

## Phase 5: User Story 3 - Apply Advanced and Custom Friction (Priority: P3)

**Goal**: A student completes freeze and long-draft gates, then creates and runs a validated custom
workflow that uses the same enforcement engine.

**Independent Test**: Start a freeze session and verify reload cannot shorten the timer; verify long
draft blocks feedback below its threshold; create, save, select, run, and delete a valid custom
workflow while invalid sequences show correction guidance.

### Tests for User Story 3

- [ ] T033 [P] [US3] Add component tests for text countdown, non-color progress, long-draft thresholds, and reload-safe freeze enforcement in src/test/components/gate-panel.test.jsx
- [ ] T034 [P] [US3] Add custom-workflow builder tests for step ordering, validation messages, save, selection, and delete confirmation in src/test/components/workflow-builder.test.jsx
- [ ] T035 [P] [US3] Add integration tests for running saved custom workflows and preserving workflow snapshots after edits in src/test/components/session-shell.test.jsx

### Implementation for User Story 3

- [ ] T036 [US3] Extend the shared gate panel with accessible wall-clock freeze countdown, usable drafting, and long-draft remaining-character guidance in src/components/gate-panel.jsx
- [ ] T037 [US3] Build custom workflow naming, ordered-step editing, inline validation, preview, save, and delete-confirmation controls in src/components/workflow-builder.jsx
- [ ] T038 [US3] Add saved custom-workflow selection and read-only prebuilt workflow behavior in src/components/workflow-picker.jsx
- [ ] T039 [US3] Persist custom workflows and immutable workflow snapshots, including delete protection for active sessions, in src/services/local-store.js and src/workflows/session-machine.js
- [ ] T040 [US3] Add custom-builder, freeze, long-draft, mobile, and keyboard-accessible styles in src/styles.css
- [ ] T041 [US3] Integrate advanced workflow selection and builder navigation into src/main.jsx

**Checkpoint**: Freeze and long-draft modes enforce cognitive friction across reloads, and valid
custom workflows run through the same reviewed session flow.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate security, accessibility, performance, and the complete quality gate.

- [ ] T042 [P] Add a representative local 100-session interaction benchmark and performance assertions in src/test/workflows/performance.test.js
- [ ] T043 [P] Add cross-workflow accessibility and keyboard-navigation tests for loading, empty, error, and interrupted states in src/test/components/accessibility.test.jsx
- [ ] T044 [P] Add security regression tests for key redaction, sessionStorage clearing, and provider allow-list enforcement in src/test/services/security.test.js
- [ ] T045 Verify all documented quickstart flows and update implementation-specific commands in specs/001-cognitive-workflows/quickstart.md
- [ ] T046 Run the full unit, component, contract, accessibility, performance, and production-build gate; record results in specs/001-cognitive-workflows/quickstart.md

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 — Setup**: Starts immediately. T001 and T002 must finish before test execution;
  T003–T005 may proceed in parallel.
- **Phase 2 — Foundational**: Depends on Phase 1. T006–T013 may start after their direct setup
  needs are available; T014 follows the workflow modules. It blocks all story UI work.
- **US1 — Guided task (P1)**: Depends on Phase 2 and is the MVP.
- **US2 — Personal model (P2)**: Depends on Phase 2 and uses the same session shell; it can begin
  after US1's shell interface stabilizes (T021).
- **US3 — Advanced/custom friction (P3)**: Depends on Phase 2 and the generic gate panel (T020);
  it can proceed after US1's shared session components stabilize.
- **Polish**: Depends on the desired user stories being complete.

### User Story Dependency Graph

```text
Setup → Foundational → US1 (MVP) ──┬→ US2 → Polish
                                  └→ US3 → Polish
```

### Parallel Opportunities

```text
# Foundation tests and services after test setup:
T006 local-store.js
T007 credential-store.js
T008 provider-adapter.js
T012 service storage tests
T013 provider adapter contract tests

# US1 tests before implementation:
T015 task-setup.test.jsx
T016 session-shell.test.jsx
T017 session-review.test.jsx

# US3 tests before implementation:
T033 gate-panel.test.jsx
T034 workflow-builder.test.jsx
T035 session-shell custom-workflow tests
```

## Implementation Strategy

### MVP First

1. Complete Phases 1 and 2, including the local-first credential boundary.
2. Complete US1 (T015–T024) with a mocked fixture connection.
3. Run `pnpm test` and `pnpm build`, then manually complete Feynman and Socratic flows by keyboard.
4. Demonstrate that an answer remains locked until learner gates are complete.

### Incremental Delivery

1. Deliver US1 as guided learning with mocked feedback.
2. Add US2 to connect a supported student-owned model without server-side key storage.
3. Add US3 for freeze, long-draft, and validated custom workflows.
4. Complete Phase 6 before release.

### Format Validation

All 46 implementation tasks use the required checkbox, sequential task ID, optional parallel
marker, required user-story label for story tasks, and exact file path format.
