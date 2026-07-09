/* hooks.server.js — runs once on server start + per request.
 * On boot: ensure the DB schema exists (no-op without a database).
 * Per request: expose auth state to load functions via event.locals. */

import { ensureSchema } from "$lib/server/db.js";
import { isAuthed } from "$lib/server/auth.js";
import { hasDatabase } from "$lib/server/config.js";

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

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
    event.locals.authed = isAuthed(event.cookies);
    return resolve(event);
}
