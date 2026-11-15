# AstroBorneo: Mission Survival Academy

**Google AI Studio Build Mode-ready migration of the actual Replit Phase 1 code.**

## IMPORTANT – do not paste the whole ZIP into a text prompt

Google AI Studio imports an existing **GitHub repository** through **Build Mode → Add files (+) → Import from GitHub**. Upload the *contents* of this extracted folder to a new GitHub repository, keeping `package.json`, `index.html`, `vite.config.ts`, `src/`, `server/`, and `public/` at the repository root. Do NOT upload a single ZIP as the only file in GitHub.

After importing, ask AI Studio to inspect `README.md` and `AI_STUDIO_HANDOFF.md`, run the project, and fix actual environment-specific issues without rewriting game logic.

## Quick start in a Node.js 22+ environment

```bash
npm install
npm run dev
```

Open the provided local preview. Both the frontend and API run on **one port** (`PORT` if provided, else 3000).

```bash
npm run typecheck
npm run test:game
npm run test:nasa
npm run build
npm start
```

- `/` — welcome page
- `/base` — interactive Moon base (Phase 1 layout)
- `/control` — working resource simulation UI (Phase 1)
- `/academy` — learning/quiz (Phase 1)
- `/about` — NASA sources and data context
- `/api/healthz` — backend health
- `/api/nasa/space-weather?eventType=FLR&startDate=2024-05-10&endDate=2024-05-10&mode=simulated` — safe offline test

## What was migrated

- All original relevant `artifacts/lunalab/src/` React components, pages, state, educational content, simulation engine, scoring, persistence, and engine regression tests
- Actual `lunar-horizon.jpg` and other web assets
- NASA DONKI provider logic, archive, cache, data normalization, and backend test cases
- Replaced Replit's generated `@workspace/api-client-react` with the local typed `src/services/space-weather-client.ts`, preserving the endpoint contract
- Removed Replit-only Vite plugins, required `BASE_PATH`, special required `PORT`, pnpm monorepo enforcement, and nonessential scaffolding
- Replaced multiple workspace dependencies with a single root `package.json`
- Updated user-visible brand **LunaLab → AstroBorneo**, with the **original localStorage key intentionally retained** for saved-game compatibility on the same origin (browser storage does NOT travel between different domains)

## What this is NOT

This is a **migration of the uploaded Phase 1 project**, NOT a visual-first redesign. Its original multi-page Mission Control / Academy UI remains; your Moon Base / picture-popup mentor redesign should be applied **after a working import** and after passing tests. Scenario AI assets are not present in the uploaded source and must be added later. No production NASA API connection is implied by this ZIP.

## NASA data setup

Default provider is NASA_CCMC (public). If a network request fails, the game uses the previously bundled historical example or clearly labeled simulated scenarios. Set `NASA_DONKI_PROVIDER=OFFLINE` to avoid live calls, or `NASA_DONKI_PROVIDER=NASA_OPEN_APIS` plus `NASA_API_KEY` in server-side Secrets for the alternate provider. Do not add API keys to frontend code, GitHub, AI prompts or `.env.example`.

Full original adapter rules and historic verification detail: `NASA_INTEGRATION.md`.

## Build Mode note

Google AI Studio is a hosted environment. This code has a conventional Node/React structure, but successful compilation on the target platform, internet npm dependency installation, server startup, and provider connectivity **must be checked inside AI Studio**. Use the AI Studio agent to resolve real runtime errors; do not assume its import guarantees compatibility.
