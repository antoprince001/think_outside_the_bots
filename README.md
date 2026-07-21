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

## How We Built It with Codex and GPT 5.6

This prototype was built over a single weekend using a **Spec-Driven Development** approach powered by **GitHub Spec Kit, Codex, and GPT-5.6**. Instead of jumping straight into implementation, every feature began as a written specification describing the problem, user experience, workflow, and expected behavior. This allowed the product to evolve rapidly while keeping the architecture and user experience consistent.

One of the biggest differences in this project was **how AI was used**. Rather than treating AI as a code generator, I treated GPT-5.6 as a collaborative design partner throughout the entire development process.

### Our Development Workflow

Instead of asking AI to "build an app," every feature followed an iterative loop:

1. **Define the learning problem**
   - Start with the educational objective rather than the implementation.
   - Ask questions like:
     - *What cognitive behavior are we trying to encourage?*
     - *Where should the student struggle?*
     - *How can we delay AI assistance without hurting the learning experience?*

2. **Brainstorm and challenge ideas**
   - GPT-5.6 acted as a brainstorming partner by:
     - Challenging assumptions.
     - Suggesting alternative learning workflows.
     - Comparing educational techniques such as the Feynman Technique, Socratic Questioning, AI Freeze Windows, Long Draft Mode, and Spaced Repetition.
     - Identifying edge cases and UX improvements.

3. **Write the specification first**
   - Every feature was translated into a specification before implementation.
   - Specs included:
     - User flows
     - Screen behavior
     - Workflow state transitions
     - AI prompts
     - Timer behavior
     - Validation rules
     - Edge cases
     - Expected outputs

4. **Implement with Codex**
   - Codex generated much of the implementation from the specifications.
   - Since the spec acted as the single source of truth, new workflows and features could be added without introducing unnecessary complexity.

5. **Review and iterate**
   - After implementation, GPT-5.6 reviewed:
     - UX consistency
     - Prompt quality
     - Workflow logic
     - Product direction
     - Potential simplifications
   - The process repeated until the feature felt intuitive.

### How We Collaborated

Throughout development, GPT-5.6 wasn't just writing code—it participated in the entire product design process.

Together we:

- Refined the core problem statement from *"AI answers too quickly"* into *"students need intentional cognitive friction before receiving AI assistance."*
- Explored dozens of learning workflows before settling on the most effective ones.
- Designed the workflow engine architecture instead of building isolated features.
- Debated trade-offs between flexibility and simplicity.
- Continuously refined prompts so the AI behaved like a tutor rather than an answer machine.
- Expanded the original concept into a configurable workflow builder capable of supporting entirely new educational experiences.

The collaboration felt less like prompting a chatbot and more like working with another engineer and product designer—one that could rapidly critique ideas, propose alternatives, and help transform abstract concepts into concrete specifications.

### Why Spec-Driven Development

Spec-Driven Development turned out to be one of the biggest accelerators during the hackathon.

Because every feature was defined before implementation:

- Features remained modular.
- Product direction stayed clear despite rapid iteration.
- Refactoring became significantly easier.
- New workflows could be introduced without rewriting existing logic.
- AI-generated code stayed aligned with the overall architecture.

During the weekend, the project evolved from a simple "delay the AI answer" concept into a configurable workflow engine capable of supporting:

- Feynman Technique
- Socratic Questioning
- AI Freeze Windows
- Adaptive AI Feedback
- Long Draft Mode
- Completely custom learning workflows

without requiring major architectural changes.

### Key Takeaway

This project reinforced that modern AI development is about much more than generating code quickly. By combining **Spec-Driven Development**, **GitHub Spec Kit**, **Codex**, and **GPT-5.6**, AI became a collaborative partner for product thinking, educational design, system architecture, UX refinement, and implementation.

The result was a working prototype built in a single weekend while maintaining a clear product vision and a scalable architecture.
