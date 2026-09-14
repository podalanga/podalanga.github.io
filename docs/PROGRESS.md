# Build progress

| Phase | Status | Commit | Notes |
|---|---|---|---|
| 0 | DONE | fc3c589 | plan + CLAUDE.md |
| 1 | DONE | (this commit) | Astro 7 scaffold (minimal template, TS strict), deps per §1, astro.config.mjs (site/sitemap/trailingSlash), src/config/site.ts, logo moved to src/assets/, favicon.svg (red dot) + regenerated favicon.ico, public/og.png (1200x630, black bg / white wordmark / red dot, built from the source logo via ImageMagick), vitest.config.ts + smoke test. `npm run build`, `npm run check`, `npm run test` all pass. |

## Decisions made without the owner
- Scaffolded Astro in a scratch dir (`npm create astro` refuses to run in a non-empty directory) then merged the generated `src/`, `public/`, `astro.config.mjs`, `package.json`, `tsconfig.json` into the repo by hand, keeping the existing `CLAUDE.md`, `docs/`, `.gitignore`, and private `resume_docs/`/`test_images/` untouched. The scaffolder's own `AGENTS.md`/`CLAUDE.md` symlink and `README.md` were discarded (ours already exist / will be written in Phase 9).
- `typescript`: plan says pin via `npm view typescript version`, which currently resolves to `7.0.2`. That major is incompatible with `@astrojs/check@0.9.10`'s peer range (`^5.0.0 || ^6.0.0`), so pinned to the latest compatible stable instead: `^6.0.3`.
- `public/og.png` generated programmatically from `podalanga_logo_no_bg.png` with ImageMagick (`convert`, available on the machine): strip the white background, recolor the black wordmark to white (red dot untouched, well outside the color-distance fuzz threshold used), composite centered on a `#0a0a0a` canvas. This is a placeholder-quality OG image; Phase 2/10 (design pass + QA) may want to revisit sizing/typography once the full design system exists.
- `favicon.ico` regenerated from the new `favicon.svg` (red dot on `--bg` dark) via ImageMagick, replacing the scaffold's default Astro rocket icon.
- Ran `npx astro telemetry disable` (local machine setting only, not a repo file) since the plan has no stated preference and this is a personal portfolio project.
- Added `npm run test` (`vitest run`) and a small smoke test (`src/config/site.test.ts`) asserting the nav order / site URL shape, since Phase 1 wires the npm script but the real unit-tested logic (eye-field, wave, terminal commands) doesn't exist until Phases 5–7; an empty vitest run would otherwise fail with "no test files found".

## Known issues / fallbacks
- None for Phase 1. `npm run build`/`check`/`test` all pass cleanly (0 errors/warnings).

## QA log (per phase: what was checked, what was fixed)
- Phase 1: ran `npm run build`, `npm run check`, `npm run test` — all pass. Verified `git status` shows only the intended new files staged (no `node_modules/`, `dist/`, `.astro/`, `resume_docs/`, or `test_images/` leaked past `.gitignore`). Visually reviewed `public/og.png` with the Read tool — legible wordmark + red dot on black, no artifacts from the background-removal step.
