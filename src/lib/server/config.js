/* config.js — server-side runtime configuration read from env vars.
 * Centralizes every environment dependency so the rest of the server code
 * imports named values instead of poking at process.env directly. */

// Base URL prepended to image paths. Empty => served locally from /assets/img.
export const ASSET_BASE_URL = (process.env.ASSET_BASE_URL || "").replace(/\/$/, "");

// Postgres connection string (Railway provides DATABASE_URL when a PG plugin
// is attached). If absent, the app falls back to the seed JSON (see db.js).
export const DATABASE_URL = process.env.DATABASE_URL || "";

// Admin auth. ADMIN_PASSWORD_HASH is an argon2 hash (see scripts/hash-password.mjs).
export const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || "";
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

export const isProd = process.env.NODE_ENV === "production";

// True when a real database is configured.
export const hasDatabase = Boolean(DATABASE_URL);

// True when the server can upload to R2 (all creds present).
export const canUploadToR2 = Boolean(
    R2.accountId && R2.accessKeyId && R2.secretAccessKey && R2.bucket
);
