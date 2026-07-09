# jonathan-freier.com — Portfolio

Personal portfolio for Jonathan Freier. Static site served from clean,
relative paths with a single centralized design system.

## Structure

```
/
├── index.html              # Home
├── resume/index.html       # Resume — skills + experience
├── projects/
│   ├── index.html          # Projects grid
│   ├── redd-robot/         # Project detail pages
│   └── kin-robot/
├── assets/
│   ├── css/
│   │   ├── base.css        # Design tokens, reset, nav, footer, buttons (shared)
│   │   ├── home.css
│   │   ├── resume.css
│   │   ├── projects.css
│   │   └── project-detail.css   # Shared by every project page
│   ├── js/nav.js           # Shared mobile-nav toggle
│   └── img/                # All images (project thumbs + per-project folders)
├── CNAME                   # jonathan-freier.com
└── README.md
```

## Conventions

- **One design system.** All shared styling (colors, nav, footer, buttons)
  lives in `assets/css/base.css` via CSS custom properties. Page stylesheets
  only add page-specific rules and are loaded after `base.css`.
- **Relative links.** No hardcoded absolute URLs — the site is portable
  between hosts.
- **Repeatable project shape.** Project detail pages use a consistent
  hero + content-`block` structure so they can be generated from a project
  JSON schema in a later phase.

## Data-driven content

Pages ship a thin HTML shell and render from JSON in `/data`:

- `data/site.json` — brand, nav, social/contact links, home hero
- `data/projects.json` — the grid **and** every detail page (canonical shape)
- `data/resume.json` — skills + experience

Renderers live in `assets/js/` (`site.js` shared helpers + one `page-*.js` per
page). Images are referenced by relative `/assets/img/...` paths; the renderer
prepends `ASSET_BASE_URL` (from the server's `/config.js`) so they can be flipped
to a CDN with one env var.

### Adding a project

1. Add an object to `data/projects.json` (see the shape of `redd-robot`).
2. If it has a detail page, create `projects/<slug>/index.html` as a 2-line
   shell with `data-slug="<slug>"` (copy an existing one).

## Backend

`server.js` (Express) serves the static site + JSON, injects `ASSET_BASE_URL`
via `/config.js`, and runs on Railway. See **[SETUP.md](SETUP.md)** for the full
Railway + Cloudflare R2 deployment walkthrough.

## Roadmap

1. ✅ **Cleanup & restructure** — centralized styling, clean paths, valid markup.
2. ✅ **Data-driven content** — project/resume JSON schema; pages render from it.
3. ✅ **Backend on Railway + R2** — Express server, `ASSET_BASE_URL` image switch,
   R2 upload script. (Deploy via SETUP.md.)
4. **Next:** an admin UI to add/edit projects (write to the JSON / a DB).

## Local development

```
npm install
npm run dev        # http://localhost:3000
```

The site also runs as plain static files (e.g. GitHub Pages); when `/config.js`
is absent, images fall back to local `/assets/img` paths.
