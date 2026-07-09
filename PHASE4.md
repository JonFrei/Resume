# Phase 4 — SvelteKit rewrite + admin CMS

The app is now a **SvelteKit** application (SSR, adapter-node) that replaces the
Express + vanilla-JS front end. The public site is unchanged for visitors; a
password-protected **`/admin`** lets you add/edit/delete projects and upload
images, with content stored in **Postgres** and images in **Cloudflare R2**.

## What changed

| Before (Phase 3) | Now (Phase 4) |
|---|---|
| Express serves static HTML + JSON | SvelteKit (SSR) via `adapter-node` |
| Content in `data/projects.json` | Content in **Postgres** (`projects` table) |
| Edit JSON by hand + redeploy | Edit in **`/admin`** (instant, no deploy) |
| Images uploaded via local script | Local script **and** admin upload → R2 |
| `npm start` = `node server.js` | `npm start` = `node build/index.js` |

The old vanilla app is preserved in **`_legacy/`** for reference and can be
deleted once you're happy with the rewrite.

## Local development

```bash
npm install
npm run dev            # http://localhost:5173
```

Without a database, the site reads `static/data/projects.json` (read-only; admin
writes are disabled). To run the admin locally you need a Postgres and the env
vars below in a `.env` file (copy `.env.example`).

Build + run the production server locally:

```bash
npm run build
npm start              # node build/index.js
```

---

## Deploying to Railway

The app still deploys from `origin/main`. `railway.json` sets
`buildCommand: npm run build` and `startCommand: npm start`.

### 1. Add a Postgres database

1. Railway → your project → **New** → **Database** → **Add PostgreSQL**.
2. Railway provisions it and exposes connection variables.
3. On your **web service** → **Variables** → add a reference variable:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
     (Railway's variable-reference syntax; picks up the DB's URL automatically.)

The app creates the `projects` table automatically on boot (`ensureSchema`).

### 2. Seed the database from the existing JSON

The table starts empty. Load your current 8 projects once:

- **Option A (Railway shell):** open the service's shell and run
  `npm run db:seed`.
- **Option B (locally, pointing at the Railway DB):** copy the DB's public
  `DATABASE_URL` from Railway into your local `.env`, then run `npm run db:seed`.

Seeding is idempotent (skips if rows already exist; `--force` wipes + reseeds).

### 3. Set the admin auth variables

Generate a password hash and a session secret locally:

```bash
node scripts/hash-password.mjs "your-strong-password"
# → prints ADMIN_PASSWORD_HASH=...

node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# → your SESSION_SECRET
```

On Railway → service → **Variables**, add:

- `ADMIN_PASSWORD_HASH` = the printed hash
- `SESSION_SECRET` = the random hex string

### 4. Give the SERVER its own R2 upload token

Admin image uploads run on the server, so it needs R2 write access. **Mint a new
token** (separate from your local upload script's keys) so you can revoke the
server's independently:

1. Cloudflare → R2 → **Manage API tokens** → **Create User API token**.
2. **Object Read & Write**, scoped to the `jonfrei-assets` bucket.
3. On Railway → service → **Variables**, add:
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`  (the new token)
   - `R2_SECRET_ACCESS_KEY`  (the new token)
   - `R2_BUCKET` = `jonfrei-assets`
   - `R2_PREFIX` = `assets/`

Keep `ASSET_BASE_URL = https://cdn.jonathan-freier.com` as before.

### 5. Deploy

Push to `main`. Railway builds (`npm run build`) and starts
(`node build/index.js`). Then:

- Visit `/admin/login`, log in with your password.
- Add/edit projects; upload images (they go to R2, served via
  `cdn.jonathan-freier.com`).
- The public site reflects changes immediately (no redeploy).

---

## Environment variables (summary)

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | Railway (ref to Postgres) | project storage |
| `ADMIN_PASSWORD_HASH` | Railway | admin login (argon2 hash) |
| `SESSION_SECRET` | Railway | signs session cookies |
| `ASSET_BASE_URL` | Railway | image CDN origin (R2) |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` / `R2_PREFIX` | Railway | server image uploads |

`.env` (local only, gitignored) can hold the same for local admin testing.

## Notes / follow-ups

- **Resume editing** is not yet in the admin (projects only, per plan). Resume
  content still lives in `src/lib/data/resume.json`.
- The public `/data/projects.json` endpoint is preserved (now served from the
  DB) for backward compatibility.
- Session cookies are httpOnly + signed; login is rate-limited (8 tries / 10 min
  per IP). For a single-admin site this is sufficient; a full user system would
  be a later phase.
- `_legacy/` can be removed once verified in production.
