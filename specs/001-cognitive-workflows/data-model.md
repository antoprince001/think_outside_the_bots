# Data Model: Cognitive Learning Workflows

All records are browser-local. API keys are excluded from normal local records and retained only in
the session-scoped credential store.

## ModelConnection

| Field | Description | Validation |
| --- | --- | --- |
| id | Stable local identifier | Required, unique |
| label | Student-visible name | Required, 1–80 characters |
| provider | Supported provider adapter identifier | Required, allow-listed |
| model | Selected provider model identifier | Required |
| status | `untested`, `valid`, `invalid`, or `unavailable` | Required |
| lastTestedAt | Latest explicit connection-test timestamp | Optional ISO timestamp |
| createdAt | Creation timestamp | Required ISO timestamp |

The credential store maps a connection ID to an API key in memory/sessionStorage. It is never
included in this entity, session records, exports, logs, or error messages.

## Workflow

| Field | Description | Validation |
| --- | --- | --- |
| id | Stable local identifier | Required, unique |
| name | Student-visible workflow name | Required, unique, 1–80 characters |
| kind | `prebuilt` or `custom` | Required |
| steps | Ordered workflow-step list | Required, valid sequence |
| finalAnswerPolicy | `allowed` or `never` | Required |
| createdAt / updatedAt | Lifecycle timestamps | Required for custom workflows |

Prebuilt workflows are read-only. A custom workflow must include a contribution before the first
AI-feedback or final-answer step, may contain at most one final-answer step, and cannot contain an
invalid or empty sequence.

## WorkflowStep

| Type | Required fields | Validation |
| --- | --- | --- |
| contribution | prompt, contributionKind, minCharacters | Trimmed contribution is 1–10,000 characters; minimum is 1–10,000 |
| freeze | prompt, durationSeconds | Integer duration from 60–3,600 seconds |
| ai_feedback | feedbackMode | Requires a prior submitted contribution |
| final_answer | allowed | At most one; occurs after a contribution |

`feedbackMode` is `gap_feedback`, `socratic_question`, or `draft_feedback`. The Feynman preset
uses gap feedback, and the Socratic preset uses only Socratic questions.

## LearningTask

| Field | Description | Validation |
| --- | --- | --- |
| id | Stable local identifier | Required, unique |
| prompt | Student's problem or objective | Required, 1–5,000 characters |
| createdAt / updatedAt | Lifecycle timestamps | Required ISO timestamps |

## LearningSession

| Field | Description | Validation |
| --- | --- | --- |
| id | Stable local identifier | Required, unique |
| taskSnapshot | Task at session start | Required |
| workflowSnapshot | Immutable selected workflow | Required |
| modelSnapshot | Connection ID, label, provider, and model; no key | Required |
| status | `setup`, `active`, `awaiting_ai`, `recoverable_error`, `interrupted`, or `complete` | Required |
| currentStepIndex | Active step position | Valid index for workflow snapshot |
| startedAt / resumedAt / completedAt | Lifecycle timestamps | Started required; others conditional |

State transitions: `setup → active → awaiting_ai → active → complete`. From `active` or
`awaiting_ai`, the session may become `interrupted`; from an AI failure it becomes
`recoverable_error → active`; resumed sessions return to `active`. A session completes only after
all required steps are complete and its final-answer policy is satisfied.

## LearnerContribution and SessionEvent

A learner contribution stores `id`, `sessionId`, `stepId`, `kind`, `body`, `status` (`draft` or
`submitted`), and timestamps. Drafts update locally; submitted contributions are immutable.

A session event is an append-only review item with `id`, `sessionId`, `type`, timestamp, and safe
display metadata. Event types include session creation, gate open, draft save, submission, freeze
start/complete, AI request/success/failure, final-answer reveal, and completion. Events never
include API keys.
