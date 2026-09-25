# podalanga

Personal portfolio for Joshua John L — robotics / control-systems engineer. Case-file/works archive, photo log, and field log, built as a static site with a Ministry-of-Truth-meets-research-lab visual language (red on black).

Full product spec and locked decisions: [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md). Build history: [`docs/PROGRESS.md`](docs/PROGRESS.md).

## Stack

Astro 7 (static output) · TypeScript strict · vanilla TS canvas effects (no React/GSAP/three.js) · Sveltia CMS at `/admin` (GitHub-backed, token sign-in) · GitHub Pages via `withastro/action`.

## Local development

```sh
npm install
npm run dev       # http://localhost:4321
```

Other scripts:

```sh
npm run build         # static build to dist/
npm run preview       # serve the production build locally
npm run check          # astro check (TypeScript + template diagnostics)
npm run test            # vitest (pure logic: eye-field, wave, terminal commands)
npm run check-links   # crawl dist/ for broken internal links (run after build)
npm run qa              # Playwright screenshot/console-error QA harness (see scripts/qa.mjs)
```

## Editing content via the CMS

Content lives as Markdown/frontmatter under `src/content/` (`works/`, `archive/`, `log/`), validated by `src/content.config.ts`.

- **Local editing without a token:** `npm run dev`, then open `http://localhost:4321/admin/` and choose **"Work with Local Repository"** — Sveltia CMS edits files directly in your working tree; review the diff and commit normally.
- **Editing from anywhere (after the repo is public at its final URL):** open `/admin/` and choose **"Sign In Using Access Token"**. See step 4 below for how to create that token. The CMS commits directly to `main`, which triggers a GitHub Actions rebuild automatically.

Collections:

| Collection | Path | Notes |
|---|---|---|
| `works` | `src/content/works/` | Case files — robotics/engineering projects. Co-located cover image + figures per entry. |
| `archive` | `src/content/archive/` | Photography (`kind: photo`) and video (`kind: video`, YouTube-only) entries. |
| `log` | `src/content/log/` | Blog posts. Co-located cover image + optional attachment under `public/media/attachments/`. |

Never commit `resume_docs/` or `test_images/` (original PDFs/photos) — both are git-ignored on purpose; only Astro-processed image renditions (EXIF/GPS-stripped) ever ship in `dist/`.

## Deployment

`.github/workflows/deploy.yml` builds with `withastro/action` and deploys via `actions/deploy-pages` on every push to `main` (and manually via **Actions → Deploy to GitHub Pages → Run workflow**).

### Manual steps (owner only — not done by the agent)

1. GitHub → repo `podalanga` → **Settings** → rename to `podalanga.github.io`; then locally: `git remote set-url origin https://github.com/podalanga/podalanga.github.io.git`.
2. **Settings → Pages → Source:** GitHub Actions.
3. Push `main` → **Actions** tab → confirm the deploy workflow succeeds → visit `https://podalanga.github.io/` and confirm `https://podalanga.github.io/farmsim_docs/` (a separate, unrelated project site) still works.
4. CMS token: GitHub → **Settings → Developer settings → Fine-grained tokens** → repository access limited to **`podalanga.github.io`** only, permission **Contents: Read & write** (Metadata read is automatic), expiry 90 days–1 year. Visit `/admin/` → **Sign In Using Access Token**. The token is stored only in that browser (localStorage), never committed.

## Coexistence note

`https://podalanga.github.io/farmsim_docs/` is a separate project site and must keep working once this repo becomes the GitHub Pages **user** site. Never add a top-level route or folder named `farmsim_docs` here.

## SEO & discoverability

Everything search engines and AI agents read is driven from `src/config/site.ts`:

- `site.person`: name, alternate names ("Joshua John", "Podalanga"), role, schools. Feeds the `Person` JSON-LD on every page, `<meta name="author">`, RSS and `/llms.txt`.
- `site.keywords`: topics you want to be associated with (e.g. *Convex Optimization*). They go into `Person.knowsAbout` (JSON-LD), `<meta name="keywords">` and `/llms.txt`. **Add a new topic here**; to also make it visible on the page, add it as an untiered item in `src/content/skills/*/index.md` (it then shows in the skills index under "terms on file"). Only list things you can back up: never hide keyword text in the page (`display:none`, off-screen, same colour as the background). Search engines treat that as spam and demote the whole site.

What the build emits: a JSON-LD `@graph` per page (WebSite + Person, plus ProfilePage / TechArticle / BlogPosting / CollectionPage / BreadcrumbList as relevant), full Open Graph + Twitter tags, a sitemap with `lastmod`, `/llms.txt` and `/llms-full.txt` (plain-Markdown site summaries for AI agents), and a `robots.txt` that explicitly welcomes search and AI crawlers. Tag pages and the 404 are `noindex`.

### Off-site steps (owner only; these matter most for ranking on your name)

1. **Google Search Console** (already verified via `public/google94f329c520ac4286.html`): submit `https://podalanga.github.io/sitemap-index.xml`, then use *URL Inspection → Request indexing* on `/` and each project page.
2. **Bing Webmaster Tools**: sign in and *Import from Google Search Console* (this also feeds DuckDuckGo, Yahoo and ChatGPT search).
3. **Link back to the site** from every profile, using the same display name, "Joshua John L":
   - GitHub: profile *Website* field, and a `podalanga/podalanga` profile README that links the site.
   - LinkedIn: *Contact info → Website*, and a *Featured* link to the site.
   - The `farmsim_docs` site, lab/club pages, Devpost, resumes and email signatures.
4. Check the results with Google's [Rich Results Test](https://search.google.com/test/rich-results) and [schema.org validator](https://validator.schema.org/) on the live URL.
5. Name searches take days to weeks to settle after indexing. Publishing new project write-ups and blog posts regularly helps.
