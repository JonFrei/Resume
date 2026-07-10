/* config.js — server-side runtime configuration read from env vars.
 * Centralizes every environment dependency so the rest of the server code
 * imports named values instead of poking at process.env directly. */

// Base URL prepended to image paths. Empty => served locally from /assets/img.
export const ASSET_BASE_URL = (process.env.ASSET_BASE_URL || "").replace(/\/$/, "");

// Postgres connection string (Railway provides DATABASE_URL when a PG plugin
// is attached). If absent, the app falls back to the seed JSON (see db.js).
export const DATABASE_URL = process.env.DATABASE_URL || "";

// Admin auth. Two ways to configure the password:
//   ADMIN_PASSWORD_HASH — an argon2 hash (see scripts/hash-password.mjs). Preferred.
//   PASSWORD            — a plaintext fallback, used only when no hash is set.
// If both are present, the hash wins.
export const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || "";
export const ADMIN_PASSWORD_PLAIN = process.env.PASSWORD || "";
// Secret used to sign session cookies. MUST be set in production.
export const SESSION_SECRET = process.env.SESSION_SECRET || "";

// R2 credentials for the SERVER's own upload capability (admin image uploads).
// These are a SEPARATE token from the local upload script's keys.
export const R2 = {
    accountId: process.env.R2_ACCOUNT_ID || "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    bucket: process.env.R2_BUCKET || "",
    // Public prefix under which image keys live (matches the /assets/img paths).
    prefix: process.env.R2_PREFIX || "assets/",
    endpoint:
        process.env.R2_ENDPOINT ||
        (process.env.R2_ACCOUNT_ID
            ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
            : ""),
};

// Hostname that serves the admin. On this host, the admin UI is mounted at the
// root (e.g. admin.jonathan-freier.com/ -> the admin dashboard). Requests to
// /admin on any OTHER host are blocked. If unset, admin stays at /admin on the
// main site (useful for local dev).
export const ADMIN_HOST = (process.env.ADMIN_HOST || "").toLowerCase();

// Absolute origin of the PUBLIC site (e.g. https://jonathan-freier.com). Needed
// so admin pages — which live on ADMIN_HOST — can link to public routes with an
// absolute URL; a relative "/resume" on the admin host is redirected back to
// /admin by hooks. When PUBLIC_SITE_URL is unset but ADMIN_HOST looks like an
// "admin." subdomain, derive the site origin by stripping that prefix. Empty in
// local dev (admin + site share one host) so links can stay relative.
function derivePublicSiteUrl() {
    const explicit = (process.env.PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
    if (explicit) return explicit;
    if (ADMIN_HOST.startsWith("admin.")) {
        return `https://${ADMIN_HOST.slice("admin.".length)}`;
    }
    return "";
}
export const PUBLIC_SITE_URL = derivePublicSiteUrl();

export const isProd = process.env.NODE_ENV === "production";

// True when a real database is configured.
export const hasDatabase = Boolean(DATABASE_URL);

// True when the server can upload to R2 (all creds present).
export const canUploadToR2 = Boolean(
    R2.accountId && R2.accessKeyId && R2.secretAccessKey && R2.bucket
);
