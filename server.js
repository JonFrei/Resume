/* server.js — Express server for the jonathan-freier.com portfolio.
 *
 * Responsibilities:
 *   - Serve the static site (HTML shells, CSS, JS) and the JSON data layer.
 *   - Expose /config.js, which injects the ASSET_BASE_URL into the page so the
 *     client renderer knows where images live (local "" or an R2/CDN origin).
 *   - Provide clean routes and a sensible 404.
 *
 * Everything the browser needs is static; this server exists so we can (a) host
 * on Railway, (b) flip images to R2 with one env var, and (c) grow a real API /
 * admin later without changing the front end.
 */

import express from "express";
import compression from "compression";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

// Base URL prepended to every image path by the client renderer.
// Empty string  -> images served locally from /assets/img/...
// "https://cdn.jonathan-freier.com" -> images served from Cloudflare R2.
const ASSET_BASE_URL = (process.env.ASSET_BASE_URL || "").replace(/\/$/, "");

app.disable("x-powered-by");
app.use(compression());

/* ------------------------------------------------------------------ *
 *  Runtime config the browser can read.
 *  Served as JS so it can be included with a plain <script> before the
 *  ES-module renderers run. Sets window.__ASSET_BASE__.
 * ------------------------------------------------------------------ */
app.get("/config.js", (_req, res) => {
    res.type("application/javascript");
    res.setHeader("Cache-Control", "no-cache");
    res.send(`window.__ASSET_BASE__ = ${JSON.stringify(ASSET_BASE_URL)};`);
});

// Optional JSON form of the same config (handy for future tooling / debugging).
app.get("/config.json", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.json({ assetBaseUrl: ASSET_BASE_URL });
});

/* ------------------------------------------------------------------ *
 *  Static assets
 * ------------------------------------------------------------------ */

// Long-cache hashed-ish static assets (CSS/JS/images). These are safe to cache
// hard because we can bust via filename or a deploy. Adjust if you add hashing.
app.use(
    "/assets",
    express.static(path.join(__dirname, "assets"), {
        maxAge: "7d",
        etag: true,
    })
);

// Data JSON changes when content changes — keep it fresh.
app.use(
    "/data",
    express.static(path.join(__dirname, "data"), {
        maxAge: 0,
        etag: true,
        setHeaders(res) {
            res.setHeader("Cache-Control", "no-cache");
        },
    })
);

// HTML shells and everything else at the root. Short cache; index resolution
// gives us clean directory URLs (/resume/ -> resume/index.html).
app.use(
    express.static(__dirname, {
        extensions: ["html"],
        maxAge: "1h",
        etag: true,
        index: "index.html",
        // Don't let the raw source of these be served as static from root.
        setHeaders(res, filePath) {
            if (filePath.endsWith(".html")) {
                res.setHeader("Cache-Control", "no-cache");
            }
        },
    })
);

/* ------------------------------------------------------------------ *
 *  404 — fall back to the site's not-found experience.
 *  (Keeps clean-URL behaviour; unknown paths get a simple 404.)
 * ------------------------------------------------------------------ */
app.use((req, res) => {
    res.status(404).type("html").send(
        `<!DOCTYPE html><meta charset="utf-8">
         <title>Not found</title>
         <body style="font-family:monospace;background:#095256;color:#fff;
                      display:flex;min-height:100vh;align-items:center;
                      justify-content:center;text-align:center;margin:0">
           <div><h1>404</h1><p>Page not found.</p>
           <p><a style="color:#BB9F06" href="/">← Home</a></p></div>
         </body>`
    );
});

app.listen(PORT, () => {
    console.log(`Portfolio server listening on :${PORT}`);
    console.log(`ASSET_BASE_URL = ${ASSET_BASE_URL || "(local /assets)"}`);
});
