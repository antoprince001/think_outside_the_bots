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

Built the prototype over a single weekend using Spec-Driven Development with GitHub Speckit, Codex, and GPT-5.6.
Rather than treating AI as a code generator, I used it as a collaborative thought partner throughout the design process. GPT-5.6 helped refine the problem statement, challenge assumptions, iterate on product concepts, and translate specifications into working features. Spec-driven development made it much easier to evolve the application without losing clarity as the product expanded.


