# Deployment Setup — Railway + Cloudflare R2

This is the full, step-by-step guide to take the portfolio live on **Railway**
and move images to **Cloudflare R2**. Nothing here is automated on your behalf —
you run each step with your own accounts and credentials.

There are two independent tracks. You can do **Railway first** (images keep
serving locally from the app) and add **R2 later** with a single env-var change.

---

## Track A — Deploy to Railway

### What Railway needs to know (already configured in the repo)
- `package.json` → `"start": "node server.js"` and `"engines": { "node": ">=20" }`
- `railway.json` → start command + healthcheck at `/config.json`
- `server.js` listens on `process.env.PORT` (Railway injects this)
- `.nvmrc` → Node 20

Railway installs only production deps (`express`, `compression`). The
`@aws-sdk/client-s3` package is a **devDependency** used solely by the local
upload script, so it is not installed on the server. Good.

### Steps

1. **Push this repo to GitHub** (it already has the `origin` remote
   `JonFrei/Resume`). Commit the Phase 3 files first (see "Before you deploy"
   at the bottom).

2. **Create the Railway project**
   - Go to <https://railway.app> → **New Project** → **Deploy from GitHub repo**.
   - Authorize Railway for the `JonFrei/Resume` repo and select it.
   - Railway auto-detects Node via Nixpacks, runs `npm install` then `npm start`.

3. **Confirm the first deploy**
   - Watch the **Deployments** tab. When it's live, open the generated
     `*.up.railway.app` URL. You should see the site with images loading
     locally (ASSET_BASE_URL is empty by default).

4. **Set environment variables** (Service → **Variables**)
   - `ASSET_BASE_URL` — leave **empty** for now (images served by the app).
     You'll set this in Track B.
   - You do **not** need to set `PORT`; Railway provides it.

5. **Add your custom domain** (Service → **Settings → Networking → Custom Domain**)
   - Add `jonathan-freier.com` (and optionally `www.jonathan-freier.com`).
   - Railway shows a CNAME target (e.g. `xxxx.up.railway.app`).

6. **Point DNS at Railway** (in Cloudflare, since you use Cloudflare DNS)
   - In the Cloudflare dashboard for `jonathan-freier.com` → **DNS → Records**:
     - For the apex `jonathan-freier.com`: add a **CNAME** to the Railway target.
       Cloudflare supports "CNAME flattening" at the apex, so this works.
     - For `www`: **CNAME** → the Railway target.
   - Set the proxy status to **DNS only** (grey cloud) initially so Railway can
     issue its TLS cert. You can turn the orange proxy on afterward if you want
     Cloudflare in front (see note below).

   > ⚠️ **You currently deploy via GitHub Pages** (there's a `CNAME` file in the
   > repo pointing `jonathan-freier.com` at Pages). Moving the domain to Railway means
   > DNS for `jonathan-freier.com` now points to Railway, not Pages. Decide the cutover:
   > either keep Pages as a fallback on a subdomain, or fully switch. The repo's
   > `CNAME` file only matters for GitHub Pages and is harmless on Railway.

7. **Verify**
   - `https://jonathan-freier.com` loads the site over HTTPS.
   - `https://jonathan-freier.com/config.json` returns `{"assetBaseUrl":""}`.

Done — the app is live on Railway. Images are still served by the Node app.

---

## Track B — Move images to Cloudflare R2

Goal: serve `/assets/img/**` from R2 at `https://cdn.jonathan-freier.com`, so the app
doesn't ship image bytes and they're cached at Cloudflare's edge (free egress).

> **First-time only:** if you've never used R2, the dashboard will ask you to
> **enable R2** and add a payment method. R2 has a generous free tier (10 GB
> storage, plus free egress) — a portfolio's images cost effectively nothing,
> but a card on file is required to activate the product.

### B1. Create the R2 bucket

1. Log in at <https://dash.cloudflare.com>.
2. In the **left sidebar**, click **R2** (listed under "R2 Object Storage").
   - If this is your first time, click **Purchase R2** / **Enable R2** and add a
     payment method when prompted, then continue.
3. On the R2 overview page, click the **Create bucket** button (top right).
4. **Bucket name:** type `jonfrei-assets`.
   - This must match `R2_BUCKET` in your `.env`. If you pick a different name,
     change it in `.env` too.
   - Names are globally scoped to your account, lowercase, and can't be renamed
     later — so choose deliberately.
5. **Location:** leave **Automatic** (Cloudflare picks a region near you). Do not
   set a jurisdiction unless you specifically need EU/FedRAMP data residency.
6. **Default storage class:** leave **Standard**.
7. Click **Create bucket**. You'll land on the bucket's **Objects** view (empty).

> Note the bucket is **private by default** — no one can read it over the web
> until you attach the custom domain in **B4**. That's intentional: we upload
> first (B3), then expose it.

### B2. Create an R2 API token (for the upload script)

This token lets the local `upload:r2` script write objects. It is separate from
the public read access you set up in B4.

1. Go back to the **R2 overview** page (click **R2** in the sidebar).
2. On the right, find the **Account details** panel. Copy your **Account ID**
   now — you'll need it as `R2_ACCOUNT_ID`. (It's a 32-character hex string; it
   also appears in the S3 endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.)
3. In that same **Account details** panel, click **Manage API tokens**
   (or **Manage R2 API Tokens**).
4. Click **Create API token** → choose **Create User API token** (simplest; a
   User token is tied to your login. An Account token needs Super Admin role).
5. **Token name:** something like `portfolio-upload`.
6. **Permissions:** select **Object Read & Write**.
   - Do NOT pick "Admin Read & Write" — the upload script only needs object-level
     access.
7. **Specify bucket(s):** choose **Apply to specific buckets only** and select
   `jonfrei-assets`. (Scoping the token to one bucket is safer than account-wide.)
8. **TTL:** leave the default (or set an expiry; if it expires you'll just make a
   new token later).
9. Click **Create API Token**.
10. Cloudflare now shows the credentials **once**. Copy all three immediately:
    - **Access Key ID**  → `R2_ACCESS_KEY_ID`
    - **Secret Access Key** → `R2_SECRET_ACCESS_KEY`
    - **Endpoint** (looks like `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`)
      — this confirms your Account ID; you don't need to set it unless you want
      to override `R2_ENDPOINT`.

    > If you navigate away before copying the secret, you can't retrieve it —
    > just delete the token and create a new one.

### B3. Upload the images

Do this from the repo root on your machine (not on Railway).

1. Create your local env file and fill in the four required values from B1/B2:

   ```
   cp .env.example .env
   ```

   Edit `.env` and set:
   ```
   R2_ACCOUNT_ID=<your 32-char account id>
   R2_ACCESS_KEY_ID=<access key id>
   R2_SECRET_ACCESS_KEY=<secret access key>
   R2_BUCKET=jonfrei-assets
   ```

2. Make sure dev dependencies are installed (the script uses the AWS SDK):

   ```
   npm install
   ```

3. **Preview first** — this needs no credentials and just prints the object keys
   that would be uploaded, so you can sanity-check them:

   ```
   npm run upload:r2 -- --dry-run
   ```

   You should see 26 keys like `assets/img/project-1.png` and
   `assets/img/redd-robot/introduction-1.png`.

4. **Load the credentials into your shell, then run the real upload.** The
   script reads `R2_*` from environment variables (it does not parse `.env`
   itself, to stay dependency-free), so set them for the session first:

   **Windows PowerShell** (your shell):
   ```powershell
   Get-Content .env | Where-Object { $_ -match '^\s*R2_' -and $_ -notmatch '^\s*#' } |
     ForEach-Object { $p = $_ -split '=', 2; [Environment]::SetEnvironmentVariable($p[0].Trim(), $p[1].Trim()) }
   npm run upload:r2
   ```

   **macOS/Linux/Git-Bash:**
   ```bash
   set -a; source .env; set +a
   npm run upload:r2
   ```

5. Watch the output — it prints `↑ assets/img/...` per file and a final
   `Uploaded 26/26` line. If credentials or the bucket name are wrong, it fails
   fast with a clear message (it does a `HeadBucket` check before uploading).

6. **Confirm in the dashboard:** R2 → `jonfrei-assets` → **Objects**. You should
   see an `assets/img/...` folder tree with all 26 images.

Every object is stored with a long immutable cache header
(`public, max-age=31536000, immutable`), so re-running the script only matters
when you add/replace images.

### B4. Make the bucket public via a custom domain

The bucket is still private. Attaching `cdn.jonathan-freier.com` makes exactly its
objects publicly readable at that hostname, cached at Cloudflare's edge.

**Prerequisite:** `jonathan-freier.com` must already be an active zone in this same
Cloudflare account (its DNS is managed here). It is, since you use Cloudflare DNS.

1. R2 → click the `jonfrei-assets` bucket.
2. Open the **Settings** tab.
3. Scroll to **Custom Domains** → click **Add**.
4. **Domain:** enter `cdn.jonathan-freier.com` → click **Continue**.
5. Cloudflare shows the **DNS record** it will create (a CNAME for `cdn`). Review
   it and click **Connect Domain**.
   - This automatically adds the DNS record and provisions a TLS certificate;
     you don't touch the DNS tab yourself.
6. The status shows **Initializing** — wait a few minutes and refresh until it
   reads **Active** (cert issuance).
7. **Test in a browser:**
   `https://cdn.jonathan-freier.com/assets/img/project-1.png` should display the image.
   - If you get SSL/`525`/`not found` errors, the cert is likely still
     provisioning — wait and retry. If it persists past ~15 min, remove and
     re-add the custom domain.

> **Faster smoke-test option (r2.dev):** if you'd rather not wait on the custom
> domain, R2 → bucket → **Settings → Public Development URL → Enable**, type
> `allow` to confirm. It gives you a `https://pub-<hash>.r2.dev` URL you can use
> as `ASSET_BASE_URL` temporarily. It is **rate-limited and for development
> only** — switch to `cdn.jonathan-freier.com` for production. Leaving `r2.dev` enabled
> also keeps the bucket publicly reachable via that URL, so disable it once the
> custom domain works.

### B5. Flip the app to R2

1. Railway → Service → **Variables** → set:
   - `ASSET_BASE_URL = https://cdn.jonathan-freier.com`
2. Railway redeploys. Now `/config.js` emits that base, and the client
   renderer rewrites every `/assets/img/...` src to
   `https://cdn.jonathan-freier.com/assets/img/...`.
3. Verify: on the live site, open DevTools → Network → images now load from
   `cdn.jonathan-freier.com`. `https://jonathan-freier.com/config.json` shows the new base.

To roll back, blank out `ASSET_BASE_URL` and redeploy — images serve locally
again. No code or data changes needed either way.

---

## Credentials checklist (what you need to gather)

| Where | Value | Used for |
|---|---|---|
| Cloudflare | Account ID | R2 endpoint |
| Cloudflare R2 | Access Key ID + Secret | `npm run upload:r2` |
| Cloudflare R2 | Bucket name (`jonfrei-assets`) | upload + public domain |
| Cloudflare DNS | Access to `jonathan-freier.com` zone | custom domains for Railway + R2 |
| Railway | GitHub repo access | deploy |
| Railway | `ASSET_BASE_URL` variable | flip images to R2 |

**Never commit** `.env` or the R2 secret — `.gitignore` already excludes `.env`.

---

## Where each credential lives (local vs Railway)

The R2 **write** keys and the R2 **read** URL are deliberately kept apart.

| Variable | Local `.env` | Railway (now) | Railway (Phase 4 admin) |
|---|---|---|---|
| `R2_ACCOUNT_ID` | ✅ | ❌ | ✅ |
| `R2_ACCESS_KEY_ID` | ✅ | ❌ | ✅ *(a new, server-only token)* |
| `R2_SECRET_ACCESS_KEY` | ✅ | ❌ | ✅ *(new token's secret)* |
| `R2_BUCKET` | ✅ | ❌ | ✅ |
| `ASSET_BASE_URL` | (optional, for local R2 test) | ✅ *(set in B5)* | ✅ |

**Why the R2 write keys are NOT on Railway now:** the running server only *reads*
image URLs; it never uploads. The `upload:r2` script runs on your machine. Giving
the public server standing write access to the bucket would be attack surface for
a capability it doesn't use.

**Phase 4 (admin UI to add projects from the site):** the server *will* upload to
R2. At that point add R2 write keys to Railway — but mint a **separate** token
scoped to the bucket, so you can revoke the server's key independently of your
local one. Same account, different token.

---

## Local development

```bash
npm install
npm run dev        # node --watch server.js, on http://localhost:3000
```

- Images serve locally by default (`ASSET_BASE_URL` empty).
- To test R2 mode locally after uploading:
  `ASSET_BASE_URL=https://cdn.jonathan-freier.com npm start`.

The site also still works as plain static files (e.g. GitHub Pages): when
`/config.js` 404s, `window.__ASSET_BASE__` is undefined and the renderer falls
back to local `/assets/img` paths.

---

## Before you deploy — commit the Phase 3 files

New/changed files in this phase:

```
package.json          server.js          railway.json
.nvmrc                .gitignore         .env.example
scripts/upload-r2.mjs
assets/js/site.js     (assetUrl helper + config injection)
assets/js/page-*.js   (image srcs routed through assetUrl)
index.html, resume/, projects/**  (added <script src="/config.js">)
SETUP.md              (this file)
```

Commit and push, then start at **Track A**.
