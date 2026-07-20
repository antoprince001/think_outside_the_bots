# Research: Cognitive Learning Workflows

## React/Vite Test Strategy

**Decision**: Retain React, Vite, and lucide-react. Add Vitest, jsdom, React Testing Library, and
user-event as development-only dependencies.

**Rationale**: The starter is a single React/Vite application with no test tooling. Vitest uses the
existing Vite pipeline and supports deterministic tests for the workflow state machine and browser
UI. Provider calls can be mocked, avoiding real keys, network calls, and cost during tests.

**Alternatives considered**:

- Jest: viable, but duplicates transform and configuration already provided by Vite.
- Browser E2E tooling: valuable for a later cross-browser release but disproportionate for the
  initial single-page feature.
- No automated UI tests: rejected because it violates the testing constitution.

## Workflow Architecture

**Decision**: Model every prebuilt and custom workflow as validated ordered steps interpreted by
one session state machine.

**Rationale**: One engine guarantees that learner gates are enforced consistently and allows custom
workflows without duplicating five separate session implementations. A session snapshots its
workflow at start, so later workflow edits cannot rewrite a student's history.

**Alternatives considered**:

- Separate page logic for each mode: rejected because gate behavior, recovery, and test coverage
  would diverge.
- Free-form custom prompts or scripts: rejected because arbitrary rules cannot be safely validated
  or reliably enforced.

## Freeze and Resume Integrity

**Decision**: Store freeze start time and duration, then calculate elapsed time against the wall
clock whenever the session renders or resumes.

**Rationale**: A decrementing in-memory timer can be bypassed by refresh or backgrounding. A
persisted end time preserves intended cognitive friction while the student's draft stays usable.

**Alternatives considered**:

- In-memory countdown only: rejected because it does not survive reload or backgrounding.
- Server timer: rejected because this release is local-first with no application backend.

## Local API-Key Boundary

**Decision**: Keep each API key in memory and sessionStorage only for the active browser session;
persist only non-secret connection metadata locally. Direct requests originate in the browser and
go only to allow-listed, supported provider endpoints.

**Rationale**: This meets the local-only requirement without creating an application-side copy of a
billable credential. sessionStorage is cleared when its browser tab closes, reducing retention.
Browser storage cannot protect a secret from script injection on the same origin, so the app also
needs a restrictive content-security policy, no untrusted scripts, no raw HTML rendering, and
redaction of authorization values from errors and logs.

**Alternatives considered**:

- localStorage persistence: rejected as the default because it exposes the key to every script on
  the origin for longer than necessary.
- Browser-local encryption: deferred; without a user-supplied secret at every launch, code running
  on the same origin can still access decryption material.
- Server-side proxy or vault: rejected because it conflicts with the local-only requirement and
  introduces backend/account scope.

## Provider Compatibility

**Decision**: Implement a narrow provider-adapter interface and show only models whose providers
support browser-origin requests. The connection test uses an explicit student action and reports
generic failures.

**Rationale**: Not every provider accepts browser requests or permits client-exposed API keys.
Explicit adapter support prevents promising arbitrary URL/key combinations that cannot work safely.

**Alternatives considered**:

- Arbitrary provider endpoints: rejected because browser compatibility and request shape cannot be
  validated safely.
- App backend relay: rejected because API keys must remain local.
