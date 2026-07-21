# Think Outside The Bots

Think with AI, not through it. An AI learning platform that challenges your thinking before giving answers.

## Run locally

Install dependencies and start the dev server:

```bash
pnpm install
pnpm dev
```

By default, the app is protected by a simple login gate. Define the credentials in environment variables before starting the app:

```bash
export VITE_DEFAULT_USERNAME=admin
export VITE_DEFAULT_PASSWORD=secret
pnpm dev
```

You can also copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Open http://localhost:5174/ in your browser.

## Build for production

```bash
pnpm build
# preview the production build locally
pnpm preview
```

## Run with Docker

The repository includes a multi-stage `Dockerfile` that builds the app with `pnpm` and serves the static `dist` via `nginx`.

Build the image, passing login credentials as build args if needed:

```bash
docker build --build-arg VITE_DEFAULT_USERNAME=admin --build-arg VITE_DEFAULT_PASSWORD=secret -t think-outside-bots .
```

Run the container (serves on port 80 inside the container):

```bash
docker run --rm -p 8080:80 think-outside-bots
```

Then open http://localhost:8080/.

## Security notes & API key handling

- API keys are intentionally stored only in browser `sessionStorage` and in-memory via `src/services/credential-store.js`. Keys are not persisted to `localStorage` and are never written into persisted user records or exported artifacts.
- The app currently sends requests directly from the browser to provider SDKs using the user's key (see `src/services/provider-adapter.js`). This means the key is present in the user's browser and will be used in outgoing network requests from the client. 

## Notes

- Development uses `pnpm` as the package manager. If you prefer `npm`/`yarn`, adapt commands accordingly.

## Usage of Codex and GPT 5.6

This prototype was built over a single weekend using a Spec-Driven Development approach powered by GitHub Spec Kit, Codex, and GPT-5.6. Instead of jumping straight into implementation, every feature began as a written specification describing the problem, user experience, workflow, and expected behavior. This allowed the product to evolve rapidly while keeping the architecture and user experience consistent.

One of the biggest differences in this project was how AI was used. Rather than treating AI as a code generator, I treated GPT-5.6 as a collaborative design partner throughout the entire development process.

Our workflow looked something like this:

Start with the learning problem. Every feature began by asking questions such as "What cognitive behavior are we trying to encourage?" rather than "What should we build?"
Iterate on product ideas together. GPT-5.6 challenged assumptions, suggested alternative learning workflows, compared educational techniques such as the Feynman Technique, Socratic questioning, AI freeze windows, long-form drafting, and spaced repetition, and helped identify which ideas best aligned with the goal of introducing intentional cognitive friction.
Refine specifications. Once an idea was selected, it was translated into detailed specifications describing user flows, UI behavior, AI prompts, state transitions, timers, workflow nodes, and edge cases before writing implementation code.
Generate implementation. Using GitHub Codex together with the specifications, individual components and features were implemented incrementally. Because the specifications acted as the single source of truth, adding new workflows or modifying existing ones remained straightforward.
Continuously review and improve. After each feature was built, GPT-5.6 was used again to critique the UX, simplify interactions, identify inconsistencies, and propose refinements before moving on to the next iteration.

This iterative cycle of Think → Specify → Build → Review → Refine made development significantly faster while producing a more coherent product than relying on ad-hoc prompting alone.

Spec-driven development also made experimentation much easier. During the weekend, the project evolved from a simple "delay the AI answer" concept into a configurable workflow engine capable of supporting multiple learning strategies—including the Feynman Technique, Socratic questioning, AI freeze windows, adaptive AI feedback, and completely custom educational workflows—without requiring major architectural changes.

Overall, this project demonstrates that modern AI development isn't just about generating code faster. When combined with clear specifications and iterative collaboration, AI becomes a partner for product thinking, system design, educational research, UX refinement, and implementation, enabling rapid prototyping while maintaining clarity and direction throughout the development process.

