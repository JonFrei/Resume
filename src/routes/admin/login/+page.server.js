import { fail, redirect } from "@sveltejs/kit";
import {
    verifyPassword,
    createSessionToken,
    SESSION_COOKIE,
    sessionCookieOptions,
    authConfigured,
} from "$lib/server/auth.js";

// Simple in-memory rate limiter: max attempts per IP per window.
const attempts = new Map(); // ip -> { count, resetAt }
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;

function rateLimited(ip) {
    const now = Date.now();
    const rec = attempts.get(ip);
    if (!rec || now > rec.resetAt) {
        attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
        return false;
    }
    rec.count += 1;
    return rec.count > MAX_ATTEMPTS;
}

export const load = ({ locals }) => {
    // Already logged in? Go to the dashboard.
    if (locals.authed) throw redirect(303, "/admin");
    return { configured: authConfigured() };
};

export const actions = {
    default: async ({ request, cookies, getClientAddress }) => {
        if (!authConfigured()) {
            return fail(500, { error: "Admin auth is not configured on the server." });
        }

        const ip = getClientAddress();
        if (rateLimited(ip)) {
            return fail(429, { error: "Too many attempts. Try again later." });
        }

        const data = await request.formData();
        const password = String(data.get("password") || "");

        if (!(await verifyPassword(password))) {
            return fail(401, { error: "Incorrect password." });
        }

        cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions());
        throw redirect(303, "/admin");
    },
};
