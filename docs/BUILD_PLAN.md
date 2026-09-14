# PODALANGA — Portfolio Build Plan (handoff spec for the implementing model)

> **To the implementing model (Sonnet):** this document is your single source of truth.
> All product decisions below are **final — the owner already approved them**. Do not re-ask them.
> Work phase by phase, meet each phase's **Done when** criteria, commit after each phase.
> Where this plan says "verify in docs", use the context7 MCP (`/withastro/docs`, `/llmstxt/sveltiacms_app_llms_txt`) — APIs may have moved since this was written.
> **Before any styling work, invoke the `frontend-design:frontend-design` skill.**

---

## 0. Context

Joshua John L ("podalanga") is a robotics / control-systems engineer (NIT Trichy ICE + IIT Madras BS Data Science; intern at EPFL BioRob). He wants a personal portfolio that is **modern, sleek, fashionable, cryptic, mysterious, and evokes perpetuity** — a *Ministry-of-Truth-meets-research-lab* aesthetic in **red and black**.

Repo: `/home/podalanga/Codes/podalanga_website` → GitHub `podalanga/podalanga` (owner will rename to `podalanga/podalanga.github.io`). Currently contains only:
- `podalanga_logo_no_bg.png` — wordmark "Podalanga" in heavy black rounded geometric sans + a red (`#ff3333`-ish) dot as the period. **The red dot is the site's core motif.**
- `resume_docs/` (git-ignored, PRIVATE — never commit/publish these PDFs): `Joshua_resume_v15.pdf`, `zbots_report.pdf`, `inverted_pendulum.pdf`, `ROV_report.pdf`, `ros2_bot.pdf`, `3r_arm_original.pdf`, `balancing_builder_bot_final.pdf`, `PLA Final v2 presentation.pptm.pptx`
- `test_images/` (git-ignored) — 12 JPEGs (~22MB, phone photos, contain EXIF incl. possibly GPS) → seed for the photo archive.
- `.gitignore` containing `resume_docs/` and `test_images/` (keep both lines).

Tooling on machine: Node 22.18 (Astro 7 needs ≥22.12 ✔), npm, `pdftotext`, `pdfimages`, ImageMagick `identify`. No exiftool.

### Locked decisions
| Topic | Decision |
|---|---|
| Framework | **Astro 7.x** (static output), **TypeScript strict**, vanilla TS for all effects (no React, no GSAP, no three.js) |
| CMS | **Sveltia CMS** at `/admin`, GitHub backend, **access-token sign-in** (no OAuth server) |
| Hosting | **GitHub Pages**, free URL `https://podalanga.github.io/` (repo renamed to `podalanga.github.io`, so **no `base` path**) |
| Deploy | GitHub Actions `withastro/action` on push to `main` (CMS commits auto-trigger rebuilds) |
| Structure | Separate pages: `/` · `/works` · `/works/[slug]` · `/archive` · `/log` (blog) · `/log/[slug]` · `404` |
| Loader | ASCII Orwell Eye on **every full page load**; **first ever view = full (~3.2s)**, subsequent full loads = **fast (~0.9s)** (flag in localStorage). Soft (client-router) navigations never show it. Always skippable. |
| Themes | Dark (default) + light. Toggle triggers an **ASCII flood wipe** transition |
| Videos | YouTube (unlisted OK) embeds only — never commit video files |
| Contact shown | Email `joshuajohn.nitt@gmail.com`, GitHub `https://github.com/podalanga`, LinkedIn `https://www.linkedin.com/in/joshuajohnl/` |
| NOT shown | No resume PDF, no report PDFs downloadable. No phone, no roll numbers, no home address |
| Seed content | Real: all works from `resume_docs/`, all 12 `test_images` in archive, 1 demo blog post |

---

## 1. Tech stack (pin exact versions at install time with `npm view <pkg> version`)

- `astro` (7.x), `@astrojs/sitemap`, `@astrojs/rss`, `@astrojs/check`, `typescript`, `sharp` (image service)
- Fonts self-hosted (no Google Fonts requests): `@fontsource-variable/archivo` (has `wdth` axis — display uses wide/expanded heavy; body normal width), `@fontsource-variable/jetbrains-mono` (labels, ASCII canvases, terminal)
- `vitest` for pure-logic unit tests
- CMS loaded in `public/admin/index.html` from `https://unpkg.com/@sveltia/cms@<pinned version>/dist/sveltia-cms.js`
- No UI framework, no CSS framework. Plain CSS with custom properties, scoped `<style>` in `.astro` components + one global stylesheet.

Scaffold: `npm create astro@latest . -- --template minimal --typescript strict --install --no-git` (then verify it didn't clobber `.gitignore`; append `node_modules/`, `dist/`, `.astro/`, `.env*`).

---

## 2. Repository layout (target)

```
.
├─ CLAUDE.md                        # short: points to docs/BUILD_PLAN.md + commands
├─ docs/BUILD_PLAN.md               # copy of THIS plan (Phase 0)
├─ astro.config.mjs                 # site: 'https://podalanga.github.io', sitemap, image cfg
├─ src/
│  ├─ config/site.ts                # name, tagline, email, socials, nav, telemetry coords, epoch date
│  ├─ content.config.ts             # collections: works, archive, log
│  ├─ content/
│  │  ├─ works/<slug>/index.md      # + figure images beside it
│  │  ├─ archive/<slug>/index.md    # + photo beside it (one entry per photo/video)
│  │  └─ log/<slug>/index.md        # blog posts, images beside them
│  ├─ assets/logo.png               # moved from root (also generate favicon + OG image)
│  ├─ styles/{tokens.css,global.css}
│  ├─ layouts/BaseLayout.astro      # <head>, boot script, ClientRouter, Header, Footer, overlays
│  ├─ components/
│  │  ├─ Header.astro  Footer.astro  ThemeToggle.astro  Logo.astro
│  │  ├─ CaseFileCard.astro  WorkMeta.astro  Redacted.astro  ScrambleText.astro
│  │  ├─ Telemetry.astro  Ouroboros.astro  Terminal.astro
│  │  ├─ Gallery.astro  Lightbox.astro  YouTubeEmbed.astro
│  │  └─ PostCard.astro  Attachments.astro  Tag.astro
│  ├─ effects/                      # framework-free TS, each exports init/destroy
│  │  ├─ ascii/glyph-atlas.ts       # pre-rendered glyphs → offscreen canvas (shared)
│  │  ├─ ascii/grid.ts              # cols/rows/DPR sizing, resize handling (shared)
│  │  ├─ eye-loader.ts  eye-field.ts (pure intensity fn, unit-tested)
│  │  ├─ theme-wipe.ts  wave.ts     (pure delay fn, unit-tested)
│  │  ├─ page-glitch.ts  scramble.ts  konami.ts  console-sigil.ts
│  │  └─ terminal/{terminal.ts, commands.ts (pure, unit-tested)}
│  ├─ lib/{dates.ts, storage.ts (try/catch localStorage wrapper), reduced-motion.ts}
│  └─ pages/
│     ├─ index.astro  404.astro  rss.xml.ts
│     ├─ works/index.astro  works/[...slug].astro
│     ├─ archive/index.astro
│     └─ log/index.astro  log/[...slug].astro  log/tag/[tag].astro
├─ public/
│  ├─ admin/{index.html, config.yml}
│  ├─ media/attachments/            # blog non-image attachments (CMS uploads here)
│  ├─ favicon.svg  robots.txt
└─ .github/workflows/deploy.yml
```

---

## 3. Design system

### 3.1 Tokens (`src/styles/tokens.css`)
Define on `:root` (= dark, default) and override on `html[data-theme="light"]`.

| token | dark | light | use |
|---|---|---|---|
| `--bg` | `#0a0a0a` | `#f2f0eb` (warm paper) | page ground |
| `--bg-raised` | `#121212` | `#e8e5de` | cards, terminal |
| `--fg` | `#e8e6e3` | `#0a0a0a` | body text |
| `--fg-muted` | `#8a8783` | `#55524d` | meta, labels (must pass WCAG AA on bg) |
| `--line` | `#262626` | `#cfcac0` | hairlines, grid |
| `--signal` | `#ff3333` | `#d90000` | THE red: dot, accents, links hover, focus |
| `--signal-dim` | `#ff333326` | `#d9000020` | glows, selection bg |
| `--redact` | `#e8e6e3` | `#0a0a0a` | redaction bars |

Also: `--font-display` (Archivo, `font-stretch: 125%`, weight 800–900), `--font-body` (Archivo 100% wdth, 400/500), `--font-mono` (JetBrains Mono). Fluid type scale with `clamp()`. Spacing scale 4px base. `::selection { background: var(--signal); color: #0a0a0a }`. Custom focus ring = 2px `--signal` outline.

### 3.2 Visual language
- **Grid & hairlines:** visible 1px `--line` rules, 12-col grid, generous negative space. Section labels in mono uppercase with tracking: `§ 02 — WORKS`, `FILE 04 // ROVIO`.
- **Red dot motif:** `●` after page titles (like the logo), blinking "REC" dot in header, custom cursor dot (desktop only, `pointer: fine`, trails the real cursor with lerp; hides over inputs), active nav item marked with a dot.
- **Texture:** subtle film grain (tiny SVG noise, `opacity .04`, `pointer-events:none`) and faint scanlines on dark theme only. Must not hurt legibility.
- **Imagery:** photos default slightly desaturated with a red duotone on hover-off → full color on hover (CSS `filter`), never on touch devices.
- **Motion rules:** everything respects `prefers-reduced-motion: reduce` (disable scramble, grain animation, cursor, glitch; loader & wipe degrade to fades). Never animate layout-shifting properties.
- **Tone of copy:** terse, bureaucratic-cryptic, but real info must stay readable by recruiters. Every cryptic label has a plain meaning nearby (e.g., nav `WORKS` with tiny mono `/02` index).

### 3.3 Header / footer
- Header (sticky, blurred bg): Logo (use the PNG; in dark theme render wordmark via CSS `filter: invert(1)` but keep dot red — easier: recreate wordmark as text "Podalanga" in Archivo 900 + `<span class="dot">` red circle; keep PNG for favicon/OG). Nav: `INDEX /00`, `WORKS /01`, `ARCHIVE /02`, `LOG /03`. Right: REC dot + IST clock, ThemeToggle (an eye icon ◉ / ◎ with label for a11y).
- Footer: Ouroboros ASCII (§6), contact links (email obfuscated §6), `© 2023–∞ PODALANGA`, hint `press [ ` ] to open terminal`.

---

## 4. Content model (`src/content.config.ts`)

Use `glob` loader with `pattern: '**/index.md'`, schema via `({ image }) => z.object(...)`. Verify the current `z` import location in Astro 7 docs.

### 4.1 `works`
```ts
{
  title: string,                 // "ZBot — Bio-inspired Zebrafish Larva Robot"
  codename: string,              // "ZBOT" (uppercase, used in FILE labels & terminal)
  fileNo: number,                // display order / "FILE 01"
  kind: 'internship' | 'project' | 'competition',
  org: string,                   // "BioRob, EPFL"
  location: string,              // "Lausanne, Switzerland"
  supervisor?: string,
  start: date, end?: date,       // omit end = ongoing ("PRESENT")
  status: 'ongoing' | 'completed',
  summary: string,               // 1–2 sentences for cards
  tags: string[],                // "Control", "Simulation", "Underwater"...
  stack: string[],               // "MuJoCo", "Python", "ROS2"...
  metrics?: { label: string, value: string }[],   // ONLY numbers present in the source docs
  cover?: image(), coverAlt?: string,
  figures?: { src: image(), caption: string }[],
  featured: boolean,             // shown on landing
  classified?: string[],         // phrases wrapped as <Redacted> in the page intro (decorative)
}
```
Body sections (markdown `##`): **Brief**, **Problem**, **Approach**, **Results**, **Status / Next**.

### 4.2 `archive`
```ts
{
  title: string,
  kind: 'photo' | 'video',
  category: 'photography' | 'music' | 'misc',
  date: date,
  location?: string,
  image?: image(),               // required when kind=photo (refine())
  alt?: string,
  youtube?: string (url),        // required when kind=video; also derive thumbnail from ID
  caption?: string,
  tags: string[],
}
```

### 4.3 `log` (blog)
```ts
{
  title: string, date: date, updated?: date,
  description: string,
  tags: string[],
  cover?: image(), coverAlt?: string,
  attachments?: { label: string, file: string }[],   // file = "/media/attachments/xyz.pdf"
  draft: boolean (default false),                    // drafts excluded from build lists/routes in production
}
```
Inline body images use relative paths (`./photo.jpg`) → Astro optimizes them.

---

## 5. Seed content (real, from `resume_docs/`)

**Rules:** only facts present in the docs; do not invent numbers, dates, co-authors or outcomes. Paraphrase; don't paste whole report paragraphs. Strip personal identifiers (roll number, phone). Keep ZBot's Science (2026) mention exactly as the resume states it (the *lab's findings* were published; do not imply Joshua authored it).

Extract text: `pdftotext -layout <file> -`. Extract figures: `pdfimages -png <file> <scratchpad>/<slug>/img` then **look at each image (Read tool)**, keep only clearly relevant diagrams/photos/plots (2–5 per work), convert to JPEG/PNG ≤ 2000px, place beside the work's `index.md`. PPTX: `unzip -j "PLA Final v2 presentation.pptm.pptx" 'ppt/media/*' -d <scratchpad>/pla` and `unzip -p ... ppt/slides/slide*.xml` for text. Never place the PDFs themselves in the repo.

| fileNo | slug | codename | kind | org / place | dates | source doc | featured |
|---|---|---|---|---|---|---|---|
| 01 | `zbot` | ZBOT | internship | BioRob, EPFL — Lausanne (Prof. Auke Ijspeert; mentor Louis Gevers) | Jun 2026 – Aug 2026 | zbots_report.pdf (32p) | ✔ |
| 02 | `rotary-inverted-pendulum` | PENDULUM | internship | NIT Trichy (Dr. D. Ezhilarasi) | Dec 2024 – present | inverted_pendulum.pdf | ✔ |
| 03 | `wheelchair-dynamics` | THRYV | internship | R2D2 / Thryv Mobility, IIT Madras | May 2025 – Jul 2025 | resume only (no figures; no cover) | |
| 04 | `ros2-differential-drive` | DIFFDRIVE | project | RMI, NIT Trichy | Sep 2025 – present | ros2_bot.pdf (35p) | ✔ |
| 05 | `rovio-underwater-rov` | ROVIO | project | RMI, NIT Trichy | Dec 2024 – present | ROV_report.pdf | ✔ |
| 06 | `3r-robotic-arm` | ARM-3R | project | NIT Trichy | Aug 2025 – Sep 2025 | 3r_arm_original.pdf | |
| 07 | `balancing-builder-bot` | BBB-2091 | competition | e-Yantra, IIT Bombay (RMI team) | Sep 2024 – Nov 2024 | balancing_builder_bot_final.pdf | |
| 08 | `pla-filament-extruder` | EXTRUDER | project | NIT Trichy | Aug 2023 – Dec 2023 | PLA pptx | |

Metrics to surface (from resume): pendulum ±4° steady-state error, 6 s settling for 20° setpoint, ±45° sweep with gain-scheduled LQR; BBB 1.27 s settling (impulse, sim); wheelchair 40 subjects; extruder ≈1.5 mm filament; ZBot CoB estimator O(Faces), single-core real-time. Add more only if they appear in the reports.

**Dossier data** (rendered on `/works`, lives in `src/config/dossier.ts`, not a collection):
- Education: NIT Trichy — B.Tech Instrumentation & Control Eng., Minor Computer Applications, Aug 2023–present, CGPA 8.5; IIT Madras — BS Data Science & Applications, Aug 2023–present, CGPA 8.91 (+ coursework lists from resume).
- Skills groups (5 groups exactly as resume: Programming & Frameworks; Robotics & Control; Simulation & Design; Hardware & Sensors; Miscellaneous).
- Awards: CSWA SolidWorks perfect score (modeling & assembly); Toastmasters District-level 1st Humorous Speech, 2nd Speech Evaluation.
- Positions: Technical Head, Robotics & Machine Intelligence (RMI) NITT, Aug 2024–present; Ex-Secretary, Toastmasters NITT, Apr 2024–present(as resume).

**Archive seed:** one `archive/<slug>/index.md` per `test_images/*` (copy the JPEG in, rename to a clean slug like `frame-001.jpg`). Titles: cryptic but neutral (`FRAME 001`, …), `category: photography`, `date` from EXIF DateTimeOriginal (read with `identify -format '%[EXIF:DateTimeOriginal]'`) or filename (`IMG20251225070852` → 2025-12-25), fallback file mtime. Leave `location` empty (don't guess). `alt`: look at each image and write a short honest description. No video seed entries — Misc/Music tabs show the empty state `NO TRANSMISSIONS RECEIVED`.

**Log seed:** one post `log/signal-acquired/index.md` — "Signal acquired" (a short welcome/intro in the site's voice, ≤250 words, clearly written as the site's opening transmission), with 1 inline image (reuse a test image), 1 attachment demonstrating the attachments block (create a tiny `public/media/attachments/signal-acquired.txt` — NOT a resume doc), tags `meta`.

---

## 6. Signature effects — specifications

All canvas effects share `ascii/grid.ts` + `ascii/glyph-atlas.ts`:
- Grid: cell size `clamp(10px, 1.1vw, 16px)` in CSS px; canvas sized to `innerWidth*DPR`; recompute on resize (debounced).
- **Performance requirement:** never call `fillText` per cell per frame. Pre-render glyph set × N brightness levels (e.g. 8) × color into an offscreen atlas once, then `drawImage` from atlas. Target 60fps at 1920×1080 on a mid laptop; cap DPR at 2. Pause via `document.visibilityState`.
- Glyph set: `" .·:-=+*<>/\\|[]{}01#%&$@"` ordered sparse→dense for brightness mapping, plus a "noise" set for flicker.

### 6.1 Eye loader (`eye-loader.ts`, `eye-field.ts`)
**Boot (inline `is:inline` script in `<head>`, runs before paint):** set `data-theme` from storage/`prefers-color-scheme`; add `html.eye-pending` which hides `body > *:not(#eye)` via CSS (so no content flash). `<noscript><style>` removes the hiding. Loader overlay is a fixed `<canvas id="eye">` on `--bg`-dark (#0a0a0a always, regardless of theme) — red glyphs.

**Field function** (pure, unit-tested) `intensity(nx, ny, t, state) → 0..1` with `nx, ny` in aspect-corrected centered coords:
- Almond eye: upper/lower lids `|ny| < H · (1 − (nx/W)²) · openness` (W≈0.62, H≈0.26 of min(viewport) ; openness 0..1 for blink).
- Lid edge band (distance to lid curve < ε): intensity 1.0.
- Sclera inside eye: 0.30 + small noise.
- Iris: circle radius Ri≈0.13 centered at `pupil` (lerped toward mouse position clamped inside eye; random saccades if no mouse). Radial striations `0.55 + 0.35·sin(24·θ + 2t)·(r/Ri)`.
- Pupil: radius Rp≈0.045·(1+0.12·sin(3t)) → intensity 0 (black void), with a tiny solid **red dot** core rendered as a filled circle (the logo dot) on top.
- Outside eye: background field 0.04–0.14 from value noise drifting slowly; optional faint radiating rays (`0.08·max(0, cos(16·atan2))`) — Orwellian "watching" halo.
- Map intensity → glyph density level + alpha. Each cell re-rolls its glyph with probability `p = 0.08 + 0.4·intensity` per frame (brighter = more restless).

**Timeline** (full / fast):
| phase | full | fast | behavior |
|---|---|---|---|
| noise | 0–0.6s | 0–0.15s | background noise fades in |
| resolve | 0.6–1.4s | 0.15–0.4s | eye mask blends in from center outward (per-cell threshold on distance) |
| watch | 1.4–2.4s | 0.4–0.55s | iris pulse, pupil tracks cursor / saccades; mono caption types out bottom-left: `OBSERVATION IN PROGRESS · SUBJECT #<4-hex from random>` and a % counter bottom-right |
| blink | 2.4–2.7s | 0.55–0.7s | openness 1→0→1 |
| dissolve | 2.7–3.2s | 0.7–0.9s | pupil radius grows to cover screen, then cells drop out randomly revealing the page; remove `eye-pending`, remove canvas, dispatch `eye:done` |

- First view → set `localStorage['pdl:eye-seen']='1'` (via safe storage wrapper) at start; if already set, use fast timeline.
- Skip: any click / keydown / touch → jump to dissolve (fast version).
- Reduced motion: render one static eye frame, hold 400ms, fade out 300ms.
- Failsafe: `setTimeout` 5s always removes `eye-pending` even if canvas errors (wrap init in try/catch). Content must be in the HTML (SEO/no-JS).
- With `<ClientRouter />`, the loader only runs on the initial document load; guard so `astro:page-load` on soft navs does not re-run it.

### 6.2 Theme flood wipe (`theme-wipe.ts`, `wave.ts`)
Triggered by ThemeToggle. Origin = toggle button center.
1. Create fixed full-screen canvas above everything (`pointer-events:none`), block toggle re-entry until done.
2. **Cover pass (~0.8s):** each cell gets delay `d = (dist(cell, origin)/maxDist)·0.55s + rand()·0.25s` (pure fn in `wave.ts`, unit-tested: monotonic in distance on average, all ≤ 0.8s). For cell time `τ = t − d`: τ<0 transparent; 0≤τ<0.18s draw flickering glyph (re-rolled every frame) in the **target theme's background color**, glyph density rising with τ; τ≥0.18s fill the cell solid with target bg. Visually: letters of the new color race across and "fill the page".
3. When all cells solid: set `html[data-theme]`, persist to storage.
4. **Reveal pass (~0.5s):** new random delays `rand()·0.35s`; each cell flickers glyphs in **target `--signal` / fg color** for 0.12s then clears → new theme is exposed beneath.
5. Remove canvas. Total ≈1.3–1.5s.
- Reduced motion: 200ms opacity crossfade of a solid overlay.
- ThemeToggle: `<button aria-pressed aria-label="Switch to light theme">`, keyboard accessible.

### 6.3 Page transitions (`page-glitch.ts`)
`<ClientRouter />` in BaseLayout. On `astro:before-swap` run a **short (≈350ms)** red glyph band sweeping top→bottom (reuse atlas + a horizontal version of wave delays), swap under the band. Disable under reduced motion (use default fade). Re-init all per-page effects on `astro:page-load`; clean up listeners/RAF on `astro:before-swap` (each effect exports `init()` returning `destroy()`).

### 6.4 Scramble text (`scramble.ts`)
Elements with `data-scramble`: on first intersection (IntersectionObserver), characters resolve left→right from random glyphs over ~600ms; on hover of links/nav, quick 250ms re-scramble. Preserve element width (`font-variant-numeric: tabular-nums`, mono labels only or wrap in inline-block with fixed width) to avoid layout shift. Screen readers get the real text (`aria-label` = final text, animated spans `aria-hidden`).

---

## 7. Cryptic layer (all must be non-blocking and a11y-safe)

1. **Hidden terminal** (`Terminal.astro` + `terminal/`): toggle with `` ` `` or `~` (ignore when focus is in input/textarea) and via footer hint button. Bottom sheet, mono, `--bg-raised`, blinking red block cursor, history (↑/↓), `Esc` closes, focus-trapped, `role="dialog"`. Commands (pure parser in `commands.ts`, unit-tested):
   - `help` · `whoami` (short bio) · `ls works` (codenames + years) · `cat <codename>` (summary + link) · `open <works|archive|log|codename>` (navigate) · `contact` · `theme [dark|light]` (triggers wipe) · `clear` · `date` · `sudo …` → `PERMISSION DENIED. THIS INCIDENT WILL BE REPORTED.` · `2+2` → `5` · unknown → `command not found: <x>. try 'help'`.
   - Data comes from content collections serialized into a `<script type="application/json">` at build time.
2. **Redacted** (`Redacted.astro`): black (theme `--redact`) bars over decorative phrases; reveal on hover/focus/tap with a scramble; real text in DOM (accessible). Use sparingly: work "classified" lines, landing manifesto.
3. **Telemetry strip** (`Telemetry.astro`, landing + footer): IST live clock, `UPTIME` counting since epoch `2023-08-01T00:00:00+05:30` (start of work history) shown as `DDDD:HH:MM:SS`, coordinates `10.7589°N 78.8132°E` (NIT Trichy) ↔ `46.5191°N 6.5668°E` (EPFL) cycling, a fake-but-plausible `SIGNAL ▮▮▮▯` meter. All in `site.ts`.
4. **Ouroboros** (`Ouroboros.astro`): small canvas/pre in footer — an ASCII ring of glyphs rotating slowly forever (glyph index shifts along a circle), red head chasing its tail. Perpetuity motif. Pause when offscreen.
5. **Konami code** (`konami.ts`): ↑↑↓↓←→←→BA → full-screen 1.5s flash: `WAR IS PEACE / FREEDOM IS SLAVERY / IGNORANCE IS STRENGTH` in display type, red on black, then fades.
6. **Console sigil** (`console-sigil.ts`): once per load, `console.log` a small ASCII eye + `%cWE SEE YOU. — github.com/podalanga` styled red.
7. **Email obfuscation**: address is `joshuajohn.nitt@gmail.com`; never put it verbatim in HTML — render as scrambled glyphs; JS assembles real `mailto:` on `astro:page-load`; `<noscript>` shows the address in `name [at] domain` form.
8. **404 page** "UNPERSON": `THIS PAGE HAS BEEN VAPORIZED. IT NEVER EXISTED.` + static ASCII eye (closed) + link home.
9. **Landing manifesto** line (display type, one sentence, scramble-in): e.g. `I BUILD MACHINES THAT BALANCE, SWIM AND SEE.` with sub-line in mono `CONTROL · ROBOTICS · SIMULATION — NIT TRICHY / EPFL`.

---

## 8. Pages

- **`/` INDEX:** hero (huge wordmark with red dot that subtly pulses; the dot reacts to cursor proximity), manifesto, telemetry strip, `FEATURED FILES` — 4 `CaseFileCard`s (featured works) in an asymmetric grid, a one-line archive teaser (3 photo thumbnails, cropped strips), latest 3 log entries, contact block.
- **`/works`:** intro `§ WORKS — CASE FILES`; filter chips (All / Internships / Projects / Competition) — progressive enhancement (works without JS: all shown); vertical **timeline** sorted by `start` desc, each row = FILE no · codename · title · org · dates · status dot (red pulsing = ongoing) · tags; then **Dossier** sections (Education, Skills, Awards, Positions) from `dossier.ts`; contact.
- **`/works/[slug]`:** header block styled as a case file (`FILE 01 // ZBOT`, status stamp `ONGOING`/`CLOSED` rotated like an ink stamp, org, supervisor, dates, location, stack chips), metrics row (big numbers), cover, body, figures grid with captions (lightbox), prev/next file navigation.
- **`/archive`:** tabs `PHOTOGRAPHY / MUSIC / MISC` (hash-linked, e.g. `#music`, no-JS fallback = stacked sections). Photography = CSS-columns masonry, `<Image>` responsive `widths=[400,800,1200]`, lazy, hover reveals mono caption (`FRAME 004 · 2025-12-25`). Lightbox: native `<dialog>`, arrow keys, swipe, esc, uses a 2000px `getImage()` rendition (never the original file). Video entries = thumbnail from `https://i.ytimg.com/vi/<id>/hqdefault.jpg` + play button → swap to `youtube-nocookie.com` iframe on click (facade pattern, no third-party load until click).
- **`/log`:** list of posts (date mono, title, description, tags), tag pages at `/log/tag/[tag]`, RSS at `/rss.xml`.
- **`/log/[slug]`:** title + meta, cover, prose styles (headings, code blocks with mono + red left rule, blockquotes as "intercepted transmission", images full-bleed optional), `Attachments` block listing files with type/size (size computed at build via `fs.stat` on `public/`), prev/next.
- **SEO:** per-page `<title>`, description, canonical, OG/Twitter tags, OG image (static, generated once from logo on black with red dot, 1200×630, committed in `public/og.png`), `sitemap`, `robots.txt` (disallow `/admin/`), JSON-LD `Person` on `/`.

---

## 9. CMS (`public/admin/`)

`index.html`: minimal HTML with `<meta name="robots" content="noindex">` + pinned Sveltia script.

`config.yml` (verify keys in Sveltia docs, especially field-level `media_folder` support):
```yaml
backend:
  name: github
  repo: podalanga/podalanga.github.io
  branch: main
  commit_messages:
    create: 'cms: create {{collection}} “{{slug}}”'
    update: 'cms: update {{collection}} “{{slug}}”'
    delete: 'cms: delete {{collection}} “{{slug}}”'
    uploadMedia: 'cms: upload “{{path}}”'
    deleteMedia: 'cms: delete “{{path}}”'
site_url: https://podalanga.github.io
media_folder: /public/media
public_folder: /media
collections:
  - name: log
    label: Log (Blog)
    folder: /src/content/log
    path: '{{slug}}/index'
    media_folder: ''        # images live beside the post → optimized by Astro
    public_folder: ''
    create: true
    slug: '{{slug}}'
    fields: title, date(datetime), updated(optional), description(text), tags(list),
            cover(image, optional), coverAlt, draft(boolean, default false),
            attachments(list of {label: string, file: file widget with
                        media_folder: /public/media/attachments, public_folder: /media/attachments}),
            body(richtext/markdown)
  - name: archive  (folder /src/content/archive, same per-entry media pattern;
            fields mirror §4.2; kind select; image & youtube optional with hints)
  - name: works    (folder /src/content/works, same pattern; fields mirror §4.1;
            figures = list of {src image, caption}; metrics = list of {label, value})
```
Field names/types must match the Zod schemas exactly (dates as `YYYY-MM-DD`). Local testing: `npm run dev`, open `http://localhost:4321/admin/`, use "Work with Local Repository" (Chromium) — confirm creating a post writes files the build accepts.

---

## 10. Deployment

`.github/workflows/deploy.yml`: the official Astro workflow — `actions/checkout`, `withastro/action` (node-version 22 or 24), `actions/deploy-pages`; `permissions: contents read, pages write, id-token write`; triggers `push: main` + `workflow_dispatch`. Use the current major versions shown in Astro's GitHub deploy guide.

`astro.config.mjs`: `site: 'https://podalanga.github.io'`, no `base`, `trailingSlash: 'ignore'`, integrations sitemap. `public/.nojekyll` not needed with Actions deploy but harmless.

**Coexistence with `https://podalanga.github.io/farmsim_docs/`:** that is a separate *project* site and keeps working after this repo becomes the user site. **Never create a top-level route or folder named `farmsim_docs`** in this site.

### Manual steps for the owner (put these in `README.md`, and tell the owner at the end — do NOT attempt them yourself)
1. GitHub → repo `podalanga` → Settings → rename to `podalanga.github.io`; then `git remote set-url origin https://github.com/podalanga/podalanga.github.io.git`.
2. Settings → Pages → Source: **GitHub Actions**.
3. Push `main` → Actions tab → confirm deploy → visit `https://podalanga.github.io/` and `/farmsim_docs/`.
4. CMS token: GitHub → Settings → Developer settings → Fine-grained tokens → repo access **only** `podalanga.github.io`, permissions **Contents: Read & write** (Metadata read auto), expiry 90 days–1 yr. Visit `/admin/` → Sign in with token. Token is stored only in that browser.

---

## 11. Phases (execute in order; commit after each with message `phaseN: <summary>` + required attribution trailer)

**Git rules:** work on `main` locally (repo has one commit); **never `git push`, rename repos, or change GitHub settings without asking the owner first.** Never commit `resume_docs/`, `test_images/`, `.env`, tokens.

| # | Phase | Key tasks | Done when |
|---|---|---|---|
| 0 | Handoff | Copy this plan to `docs/BUILD_PLAN.md`; create `CLAUDE.md` (≤30 lines: stack, commands, "read docs/BUILD_PLAN.md", guardrails from §11/§12) | files committed |
| 1 | Scaffold | Astro minimal TS strict; deps §1; `astro.config.mjs`; `.gitignore` merge; `src/config/site.ts`; move logo to `src/assets/`; favicon (red dot SVG) + `public/og.png`; vitest config; npm scripts `dev, build, preview, check (astro check), test (vitest run)` | `npm run build` + `npm run check` pass |
| 2 | Design system & layout | Invoke frontend-design skill. `tokens.css`, `global.css` (reset, type scale, prose, grain, focus, selection), fonts, `BaseLayout` with head boot script (theme + eye-pending) and `<ClientRouter/>`, Header, Footer (static parts), plain ThemeToggle (instant switch for now) | Both themes render correctly at 390px & 1440px; no FOUC on reload |
| 3 | Content layer + seed | `content.config.ts` schemas §4; write 8 works from docs with figures; `dossier.ts`; 12 archive entries; 1 log post + attachment | `astro build` validates all entries; figures visually checked relevant |
| 4 | Pages | All pages §8 incl. lightbox, YouTube facade, filters, tags, RSS, 404, SEO, sitemap, robots | Every route builds; links have no 404s (crawl `dist/`); works without JS |
| 5 | ASCII engine + Eye loader | `grid.ts`, `glyph-atlas.ts`, `eye-field.ts` (+tests), `eye-loader.ts` full/fast/skip/reduced/failsafe | Full plays once, fast afterwards, skip works, no content flash, ~60fps, soft navs don't replay |
| 6 | Theme wipe + page glitch + scramble | `wave.ts` (+tests), `theme-wipe.ts`, `page-glitch.ts`, `scramble.ts`; lifecycle init/destroy on router events | Toggle floods correctly from button in both directions; persistence; reduced-motion fallbacks; no leaked RAF/listeners after 10 navigations |
| 7 | Cryptic layer | §7 items 1–9 (terminal commands +tests) | All commands work; Konami works; a11y: terminal focus trap + Esc, redaction readable by SR |
| 8 | CMS | `public/admin` §9 | Local-repo mode: create/edit a log post with image + attachment and a video archive entry → `npm run build` passes and pages render them; then revert test entries |
| 9 | Deploy + docs | workflow §10; README (what the site is, local dev, content editing via CMS, manual steps §10) | `act`-free sanity: workflow YAML valid; build from clean clone (`git clone . /scratch/x && npm ci && npm run build`) passes |
| 10 | QA & polish | §13 verification checklist; fix findings; run `superpowers:requesting-code-review` or `/code-review` if available | Checklist all green; report to owner with screenshots + manual steps |

---

## 12. Guardrails (common failure modes — avoid)

- Don't ship generic "dev portfolio" look (centered hero + gradient + cards). Follow §3 & the frontend-design skill; red is an accent, not a flood (except loader/konami).
- Don't invent achievements, metrics, dates, or links. Don't publish report PDFs, resume, roll numbers.
- Don't reference original full-size photos in `<a href>`/`src` — always Astro-processed renditions (strips EXIF/GPS). Verify in QA.
- Don't use `fillText` per cell per frame; don't run RAF when tab hidden or effect offscreen.
- Don't break no-JS: all content and navigation must work with JS disabled (effects are enhancement).
- Don't hide content from crawlers behind the loader (content is in HTML; loader is an overlay).
- Every `localStorage` access goes through `lib/storage.ts` (try/catch).
- Keep each effect file focused (<300 lines); pure math in separate tested modules.
- Don't add dependencies beyond §1 without a strong reason (note it in the commit).
- Don't add analytics, cookies, trackers, or third-party embeds that load before user click.

---

## 13. Verification (end-to-end)

Automated:
- `npm run check` (0 errors) · `npm run test` (eye-field, wave, terminal commands) · `npm run build` (0 warnings about content schemas).
- Link crawl of `dist/`: small node script checking every internal `href`/`src` resolves to a file.
- EXIF check: `identify -verbose dist/_astro/*.jpg | grep -i -E 'gps|exif:Make'` → no matches; `grep -r "test_images\|resume_docs" dist` → no matches; confirm no `.pdf` in `dist`.

Browser (use Playwright MCP against `npm run preview`):
- Screenshots of `/`, `/works`, `/works/zbot`, `/archive`, `/log/signal-acquired`, `/404` at **1440×900 and 390×844**, **both themes**; review them visually and fix issues.
- Loader: clear localStorage → reload → full sequence (capture mid-frames at ~1.0s & ~2.0s screenshots showing the eye); reload → fast; press a key during loader → skips.
- Theme wipe: click toggle, screenshot at ~300ms (mid-flood) and after; reload keeps theme.
- Navigate across 10 pages via links: no console errors, effects still functional, no duplicate canvases in DOM.
- `page.emulateMedia({ reducedMotion: 'reduce' })`: no loader animation beyond fade, no scramble.
- JS disabled context: all pages readable, nav works, gallery images visible.
- Terminal: `` ` `` opens, `help`, `ls works`, `cat zbot`, `open archive` navigates, `Esc` closes.
- Keyboard-only pass: visible focus rings everywhere, lightbox & terminal trap/restore focus.
- Performance: `npx lighthouse http://localhost:4321/ --preset=desktop` (if available) — target Perf ≥ 90, A11y ≥ 95, SEO 100 (loader excluded from LCP concerns since content is in HTML).

Final report to owner: what was built, screenshots, how to edit content, the 4 manual GitHub steps (§10), and anything deferred.

---

## 14. AUTONOMOUS OVERNIGHT MODE (overrides anything above that implies waiting for the owner)

The owner is **asleep**. You are run headless by `scripts/overnight.sh`, **one phase per session** (fresh context each time). Nobody can answer questions or look at screenshots until morning.

### 14.1 Operating rules
1. **Never stop to ask.** No AskUserQuestion, no "should I proceed?". Make the best judgment consistent with this plan, then record it under *Decisions made without the owner* in `docs/PROGRESS.md`.
2. **Start of every session:** read `CLAUDE.md`, this plan, `docs/PROGRESS.md`, and `git log --oneline`. Resume exactly where the previous session stopped (a phase may be half-done — inspect the working tree, don't redo committed work, don't blindly overwrite).
3. **Do only the phase you were given.** When its *Done when* criteria pass: update `docs/PROGRESS.md`, commit, and end the session with the final line `PHASE <N> COMPLETE`.
4. **If blocked:** try up to 3 genuinely different approaches. Still blocked → implement the simplest working fallback that preserves the plan's intent (e.g. a simpler effect, a static image), log it under *Known issues / fallbacks*, and still complete the phase. Never leave the build broken at the end of a session — `npm run build` must pass before you commit.
5. **Forbidden:** `git push`, `gh` commands that change anything remote, deleting/rewriting git history, touching files outside this repo (except the scratchpad / system temp), `sudo`, installing global/system packages, editing `~/.claude` settings, committing anything from `resume_docs/` or original `test_images/` paths.
6. **Background processes:** any `astro dev`/`preview` server you start must be stopped before the session ends (`kill` the PID you started; use ports 4321/4322 only).
7. **Context hygiene:** don't dump whole PDFs or huge logs into context; pipe through `head`/`grep`. Use subagents for heavy reading (e.g. extracting one report) if helpful.

### 14.2 Self-verification replaces owner review
Add devDependency `playwright` (allowed exception to §12 dependency rule; do **not** download browsers — use the installed Google Chrome via `channel: 'chrome'`, headless). Create `scripts/qa.mjs` + npm script `qa` that, against `npm run preview`:
- captures screenshots listed in §13 (both themes, 1440×900 and 390×844) into `qa-artifacts/screenshots/<phase>/` (git-ignored),
- collects console errors/page errors and fails on any,
- checks no horizontal overflow at 390px (`document.documentElement.scrollWidth <= innerWidth`),
- for Phase 5+: loader frames (localStorage cleared → mid-sequence screenshot; second load fast; keypress skip), for Phase 6+: mid-wipe screenshot, reduced-motion run, JS-disabled run.

Then **look at the screenshots yourself with the Read tool** and critique them against §3 and the frontend-design skill (hierarchy, spacing, contrast in both themes, nothing generic, nothing overlapping/clipped at 390px). Fix what you find, re-shoot. At least one critique→fix iteration in Phases 2, 4, 5, 6, 10. Record the critique briefly in PROGRESS.md.

Playwright MCP tools are also available if useful, but `npm run qa` is the source of truth.

### 14.3 `docs/PROGRESS.md` format (create in Phase 1, keep updated)
```
# Build progress
| Phase | Status | Commit | Notes |
|---|---|---|---|
| 0 | DONE | fc3c589 | plan + CLAUDE.md |
| 1 | DONE / IN PROGRESS / BLOCKED-FALLBACK | <sha> | ... |

## Decisions made without the owner
## Known issues / fallbacks
## QA log (per phase: what was checked, what was fixed)
```

### 14.4 Phase 10 extra deliverable — `docs/MORNING_REPORT.md`
Written for the owner to read with coffee: what was built (per page), how to run it (`npm install && npm run preview`), a curated list of the best screenshot paths to open, all decisions made without them, known issues, the §10 manual GitHub steps, and a suggested short list of things they should personally review/decide. Also copy ~8 key screenshots to `docs/preview/` (committed, compressed ≤300KB each) so they can view them on GitHub/phone.

### 14.5 Phase-specific notes for unattended runs
- **Phase 8 (CMS):** "Work with Local Repository" needs a human clicking a browser folder picker — skip that. Instead: validate `public/admin/config.yml` against the Sveltia JSON schema (`https://unpkg.com/@sveltia/cms/schema/sveltia-cms.json`, e.g. with a tiny `ajv` run via `npx`), load `/admin/` in headless Chrome and confirm the login screen renders with no console errors, and hand-write one test entry per collection exactly as Sveltia would save it (frontmatter keys/format per its docs) → `npm run build` passes → delete the test entries. Note in MORNING_REPORT that the owner should do one real CMS round-trip.
- **Phase 9:** don't run the workflow; validate YAML syntax (`npx --yes yaml-lint` or node `yaml` parse) and do the clean-clone build.
