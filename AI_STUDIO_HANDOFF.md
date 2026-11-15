# Google AI Studio Handoff — AstroBorneo

## Read this before changing any code

The project files in the GitHub repository are the COMPLETE existing Replit Phase 1 project, refactored to a standard single-root Vite React + Node Express layout. It is not an empty starter template. Preserve existing work.

## Paste this into Google AI Studio AFTER a successful GitHub import

You are continuing the existing AstroBorneo project imported from GitHub. This repository contains a real, already-developed React/TypeScript simulation and an Express NASA DONKI API. First inspect package.json, README.md, src/App.tsx, src/game/engine.ts, src/game/engine.test.ts, src/state/game.tsx, and server/index.ts. Run npm install, npm run typecheck, npm run test:game, npm run test:nasa, and npm run build where possible; run the app and inspect its actual preview. Do NOT recreate or replace the application, rename source modules unnecessarily, invent game-state formulas, or turn working pages into static mockups. Fix ONLY demonstrated compatibility/build/runtime problems. Confirm a real HTTP response from /api/healthz and /api/nasa/space-weather?eventType=FLR&startDate=2024-05-10&endDate=2024-05-10&mode=simulated. Preserve the existing deterministic five-cycle engine, resource calculations, NASA data labels, quiz/scoring, state persistence and all application routes. Use server-side Secrets for credentials and do not request them in chat. Report exactly what ran, what passed, any missing modules or runtime issues, and each file changed. Only after functional verification should we run our new visual-first Moon-base redesign prompts.

## Regression checkpoint

Expected Standard / Greenhouse ON / Recycler ON / Communications OFF first cycle:
Power 66, Air 54, Water 57, Food 40, Crew Safety 90.

Expected five-cycle path resources:
Cycle 1: 66 / 54 / 57 / 40 / 90
Cycle 2: 53 / 50 / 56 / 44 / 90
Cycle 3: 49 / 52 / 47 / 48 / 90
Cycle 4: 33 / 54 / 46 / 52 / 85
Cycle 5: 32 / 50 / 45 / 44 / 85.

### After import

The requested subsequent redesign is **visual-first**: the Moon Base is the primary scene, with picture-based questions and popups. The real simulation and NASA logic MUST remain functional. Do NOT perform that redesign during this migration verification step.
