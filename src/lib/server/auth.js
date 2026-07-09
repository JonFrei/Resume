/* auth.js — single-admin password auth with signed session cookies.
 *
 * Flow: POST password -> verify against the admin password -> issue a signed,
 * httpOnly cookie whose value is an HMAC of an expiry timestamp. No DB session
 * table needed for a one-admin site; the signature is the session.
 *
 * The admin password can be configured two ways:
 *   ADMIN_PASSWORD_HASH — argon2 hash (preferred; nothing sensitive stored).
 *   PASSWORD            — plaintext fallback, used only when no hash is set.
 */

import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { verify as argonVerify } from "@node-rs/argon2";
import {
    ADMIN_PASSWORD_HASH,
    ADMIN_PASSWORD_PLAIN,
    SESSION_SECRET,
    isProd,
} from "./config.js";

export const SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

// Effective secret: prefer configured secret; in dev, fall back to a random
// per-boot secret so cookies work locally (sessions just won't survive restart).
const SECRET = SESSION_SECRET || (isProd ? "" : randomBytes(32).toString("hex"));

export function authConfigured() {
    return Boolean((ADMIN_PASSWORD_HASH || ADMIN_PASSWORD_PLAIN) && SECRET);
}

/* ---------- Password ---------- */

// Constant-time string comparison for the plaintext path.
function safeEqual(a, b) {
    const ab = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    if (ab.length !== bb.length) return false;
    return timingSafeEqual(ab, bb);
}

export async function verifyPassword(password) {
    // Prefer the hash when configured.
    if (ADMIN_PASSWORD_HASH) {
        try {
            return await argonVerify(ADMIN_PASSWORD_HASH, password);
        } catch {
            return false;
        }
    }
    // Plaintext fallback (only when no hash is set).
    if (ADMIN_PASSWORD_PLAIN) {
        return safeEqual(password, ADMIN_PASSWORD_PLAIN);
    }
    return false;
}

/* ---------- Session token: "<expiryMs>.<hmac>" ---------- */

function sign(value) {
    return createHmac("sha256", SECRET).update(value).digest("hex");
}

export function createSessionToken() {
    const expiry = String(Date.now() + SESSION_TTL_MS);
    return `${expiry}.${sign(expiry)}`;
}

export function verifySessionToken(token) {
    if (!token || !SECRET) return false;
    const dot = token.indexOf(".");
    if (dot < 0) return false;
    const expiry = token.slice(0, dot);
    const mac = token.slice(dot + 1);
    const expected = sign(expiry);
    // Constant-time compare of the HMACs.
    const a = Buffer.from(mac);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
    return Number(expiry) > Date.now();
}

/* ---------- Cookie helpers ---------- */

export function sessionCookieOptions() {
    return {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: isProd,
        maxAge: SESSION_TTL_MS / 1000,
    };
}

// Is this request authenticated? (reads the SvelteKit cookies object)
export function isAuthed(cookies) {
    return verifySessionToken(cookies.get(SESSION_COOKIE));
}
