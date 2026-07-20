# Quickstart: Cognitive Learning Workflows

## Prerequisites

- Node.js version supported by Vite 8 (Node 20.19+ or 22.12+)
- pnpm
- A supported AI-provider account and API key for manual provider testing

## Run locally

```bash
pnpm install
pnpm dev
```

Open the URL printed by Vite. Add a test model connection only in the browser you control; the key
must remain in session-scoped browser storage and is cleared when that browser session ends.

## Verify behavior

```bash
pnpm test
pnpm build
```

Current verification (2026-07-20): `CI=true pnpm test` passed (2 files, 3 tests) and
`CI=true pnpm build` passed. Use `CI=true` in non-interactive environments where pnpm would
otherwise request confirmation before refreshing dependencies.

Before merging, verify the Feynman, Socratic, freeze, long-draft, and custom workflows block AI
feedback until their learner gates are met. Confirm a connection key is masked after entry, does
not appear in browser-visible app records, and that an AI failure leaves the latest task and draft
available for retry or model selection.

## Manual accessibility and performance checks

- Complete setup, all gate types, model error recovery, and review using only the keyboard.
- Check that freeze time is communicated as text and is not dependent on color.
- Resize to a narrow mobile viewport and verify the same setup-to-review journey remains usable.
- With representative local sessions, verify local interactions meet the plan targets; record
  provider latency separately.
