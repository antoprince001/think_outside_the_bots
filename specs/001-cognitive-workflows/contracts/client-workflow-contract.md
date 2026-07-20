# Client Workflow Contract

This contract defines the browser application's internal boundaries and user-visible behavior. It
does not introduce an application backend.

## Provider Adapter

```text
testConnection(connectionId, key) -> { status: valid | invalid | unavailable }
requestFeedback({ connection, key, task, workflow, contributions, feedbackMode })
  -> { kind: feedback | question | final_answer, content }
```

- The adapter MUST accept only supported, allow-listed provider identifiers and browser-compatible
  endpoints.
- `key` MUST come from the session-scoped credential store and MUST NOT be written to task, session,
  event, export, telemetry, or error objects.
- The UI MUST show the provider-data notice before `requestFeedback` is first used for a session.
- Connection testing and feedback failures MUST expose generic safe messages and retain the
  student's work. The UI offers Retry and Change model.

## Workflow Interpreter

```text
startSession({ task, workflow, modelConnectionId }) -> LearningSession
submitContribution({ sessionId, stepId, body }) -> GateResult
resumeSession(sessionId) -> LearningSession
requestFeedback(sessionId) -> GateResult | ProviderRequest
revealFinalAnswer(sessionId) -> GateResult
```

- `startSession` rejects a missing task, workflow, model connection, unsupported provider, or
  invalid custom workflow.
- `submitContribution` trims text, validates the current contribution step, records the submission,
  and advances only when its minimum is met.
- `requestFeedback` is rejected until all preceding learner and freeze gates are complete.
- A freeze gate calculates remaining time from persisted timestamps; it cannot be bypassed by
  reloading.
- `revealFinalAnswer` is available only at the configured final-answer step and never renders for
  workflows with `finalAnswerPolicy: never`.

## UI States

| State | Required presentation | Primary action |
| --- | --- | --- |
| Setup | Task, workflow, model selection, and provider disclosure | Start learning session |
| Learner gate | Learning goal, prompt, draft progress, and exact requirement | Submit contribution |
| Frozen | Text countdown and non-color progress plus usable draft area | Continue drafting |
| AI loading | Immutable contribution and provider status | Wait |
| Recoverable error | “Your work is safe,” retained draft, generic failure reason | Retry or change model |
| Review | Ordered timeline of task, gates, contributions, feedback, and answer status | Start another task |

All interactive controls are keyboard operable, announce timer/status changes accessibly, and use
plain language that frames friction as a learning goal rather than a failure.
