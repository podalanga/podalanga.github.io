# Podalanga — personal portfolio

**Read `docs/BUILD_PLAN.md` first.** It is the approved, final spec (decisions, design system, content model, effects, phases, verification). Execute it phase by phase; don't re-ask decisions it marks as locked.
When launched by `scripts/overnight.sh` (headless), follow **§14 Autonomous overnight mode**: never ask questions, one phase per session, self-verify with `npm run qa` screenshots, log decisions in `docs/PROGRESS.md`.

## Stack
Astro 7 (static) · TypeScript strict · vanilla TS canvas effects · Sveltia CMS (`/admin`, GitHub token sign-in) · GitHub Pages via `withastro/action`.

## Commands
- `npm run dev` — local dev at http://localhost:4321 (CMS at `/admin/`, use "Work with Local Repository")
- `npm run build` / `npm run preview`
- `npm run check` — `astro check`
- `npm run test` — vitest (pure logic: eye-field, wave, terminal commands)

## Guardrails
- Invoke the `frontend-design:frontend-design` skill before styling work.
- Verify Astro / Sveltia APIs with context7 (`/withastro/docs`, `/llmstxt/sveltiacms_app_llms_txt`) before relying on memory.
- NEVER commit or publish `resume_docs/` or `test_images/` originals, PDFs, tokens, roll numbers, or the email verbatim in HTML.
- Photos are served only as Astro-processed renditions (EXIF/GPS stripped).
- Don't invent achievements, metrics, dates or links — only what's in `resume_docs/`.
- Never `git push`, rename the repo, or change GitHub settings without asking the owner.
- Never create a route/folder named `farmsim_docs` (a separate project site lives at that path).
- All content must work with JS disabled; every effect respects `prefers-reduced-motion`.
- Commit after each phase: `phaseN: <summary>`.
