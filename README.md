# jonathan-freier.com — Portfolio

Personal portfolio for Jonathan Freier. A **SvelteKit** app (SSR) with a
password-protected admin CMS. Projects live in **Postgres**, images in
**Cloudflare R2**, deployed on **Railway**.

## Structure

```
src/
├── app.html                     # HTML shell
├── hooks.server.js              # boot schema + per-request auth
├── lib/
│   ├── styles/base.css          # design tokens + shared component classes
│   ├── styles/admin.css         # admin styling
│   ├── assets.js                # assetUrl() — prepends ASSET_BASE_URL
│   ├── data/{site,resume}.json  # static content (nav, hero, resume)
│   ├── components/              # Nav, Footer, ProjectBlock, admin/*
│   └── server/                  # config, db, auth, r2, projectForm
└── routes/
    ├── +page.svelte             # Home
    ├── resume/                  # Resume
    ├── projects/                # Grid + [slug] detail (from DB)
    ├── data/projects.json/      # JSON endpoint (from DB, back-compat)
    └── admin/                   # Login + project CRUD + image upload
static/
├── assets/img/                  # images (also mirrored to R2)
├── data/projects.json           # DB seed source
└── CNAME
scripts/                         # seed-db, hash-password, upload-r2
_legacy/                         # pre-Phase-4 vanilla app (reference; removable)
```

## Content model

- **Projects** — stored in Postgres (`projects` table). Frequently-queried
  fields are columns; the nested hero/blocks structure is a `content` jsonb.
  Managed via `/admin`. Falls back to `static/data/projects.json` with no DB.
- **Resume / site** — static JSON in `src/lib/data/` (edited in code for now).
- **Images** — referenced by `/assets/img/...`; `assetUrl()` prepends
  `ASSET_BASE_URL` so they resolve from R2 (`cdn.jonathan-freier.com`) in prod.

## Admin

`/admin` (password-protected) — create/edit/delete projects, edit the block
structure, and upload images (which go to R2). See **[PHASE4.md](PHASE4.md)**.

## Local development

```bash
npm install
npm run dev            # http://localhost:5173
```

Without `DATABASE_URL`, the site reads the seed JSON (read-only). For admin, set
the env vars in `.env` (see `.env.example`) and point at a Postgres.

Production build:

```bash
npm run build && npm start     # node build/index.js
```

## Roadmap

1. ✅ Cleanup & restructure (centralized styling, clean paths)
2. ✅ Data-driven content (JSON schema)
3. ✅ Backend on Railway + Cloudflare R2 images
4. ✅ SvelteKit rewrite + admin CMS (Postgres) — deploy per PHASE4.md
5. **Next:** resume editing in admin; drag-reorder; project preview

## Deployment

`origin/main` → Railway (`npm run build` → `node build/index.js`).
Full deploy walkthrough: **[PHASE4.md](PHASE4.md)**. R2/Cloudflare setup:
**[SETUP.md](SETUP.md)**.

**Env vars** are documented in **[.env.example](.env.example)** — set them as
Railway service Variables in prod. Note `BODY_SIZE_LIMIT`: adapter-node caps
request bodies at 512K by default, which is below the 8 MB image-upload limit,
so it must be raised (e.g. `9437184`) or admin uploads over 512K fail with a 413.
