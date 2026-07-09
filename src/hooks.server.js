/* hooks.server.js — runs once on server start + per request.
 *
 * Boot:  ensure the DB schema exists (no-op without a database).
 * Request:
 *   - Expose auth state to load functions via event.locals.
 *   - Host-based admin isolation. When ADMIN_HOST is set (e.g.
 *     admin.jonathan-freier.com):
 *       • the admin lives at /admin on that host (admin.jonathan-freier.com/admin);
 *       • the admin host's root (/) redirects to /admin for convenience;
 *       • /admin on any OTHER host redirects to the admin host, so there is one
 *         canonical admin location;
 *       • static assets / framework files pass through on any host.
 *     When ADMIN_HOST is unset (local dev), admin stays at /admin on the main
 *     site with no host restriction.
 */

import { redirect } from "@sveltejs/kit";
import { ensureSchema } from "$lib/server/db.js";
import { isAuthed } from "$lib/server/auth.js";
import { hasDatabase, ADMIN_HOST } from "$lib/server/config.js";

// Initialize schema once at startup (fire-and-forget; failures are logged).
let schemaReady = null;
function initSchema() {
    if (!schemaReady) {
        schemaReady = ensureSchema().catch((err) => {
            console.error("Schema init failed:", err.message);
        });
    }
    return schemaReady;
}
if (hasDatabase) initSchema();

function isPassThrough(pathname) {
    return (
        pathname.startsWith("/_app/") ||
        pathname.startsWith("/assets/") ||
        pathname === "/favicon.ico" ||
        pathname === "/robots.txt"
    );
}

const isAdminPath = (p) => p === "/admin" || p.startsWith("/admin/");

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
    // Auth state is needed by every route (admin guards, etc.).
    event.locals.authed = isAuthed(event.cookies);

    if (ADMIN_HOST) {
        const host = event.url.hostname.toLowerCase();
        const path = event.url.pathname;
        const onAdminHost = host === ADMIN_HOST;

        if (onAdminHost) {
            // Convenience: admin-host root -> the admin dashboard.
            if (path === "/") throw redirect(307, "/admin");
            // The admin host should only serve admin + static assets. Anything
            // else (someone poking at the public routes here) goes to /admin.
            if (!isAdminPath(path) && !isPassThrough(path)) {
                throw redirect(307, "/admin");
            }
        } else if (isAdminPath(path)) {
            // Admin requested on a non-admin host -> send to the admin host.
            throw redirect(307, `https://${ADMIN_HOST}${path}`);
        }
    }

    return resolve(event);
}
