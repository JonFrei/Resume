/* db.js — Postgres access for projects, with a JSON fallback.
 *
 * Storage model: one `projects` row per project. The frequently-queried fields
 * (slug, title, tagline, thumb, position, has_detail, external_url, code_url)
 * are real columns; the deep, variable structure (hero + blocks) lives in a
 * single `content` jsonb column. This keeps ordering/lookup relational while
 * not shredding the nested block shape into many tables.
 *
 * Fallback: if DATABASE_URL is unset, reads static/data/projects.json so the
 * public site still works with no database (e.g. local dev, or before the DB
 * is provisioned). Writes require a database.
 */

import pg from "pg";
import { DATABASE_URL, hasDatabase } from "./config.js";
// Seed data is imported (bundled by Vite), NOT read from disk — a filesystem
// path relative to the source breaks once the code is bundled into build/.
import seedData from "../../../static/data/projects.json" assert { type: "json" };

let pool = null;
function getPool() {
    if (!hasDatabase) return null;
    if (!pool) {
        pool = new pg.Pool({
            connectionString: DATABASE_URL,
            // Railway Postgres requires SSL; allow self-signed in that managed context.
            ssl: DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
        });
    }
    return pool;
}

/* ---------- Schema ---------- */

export async function ensureSchema() {
    const p = getPool();
    if (!p) return;
    await p.query(`
        CREATE TABLE IF NOT EXISTS projects (
            id           SERIAL PRIMARY KEY,
            slug         TEXT UNIQUE NOT NULL,
            title        TEXT NOT NULL,
            tagline      TEXT NOT NULL DEFAULT '',
            thumb        TEXT NOT NULL DEFAULT '',
            has_detail   BOOLEAN NOT NULL DEFAULT false,
            external_url TEXT,
            code_url     TEXT,
            content      JSONB NOT NULL DEFAULT '{}'::jsonb,
            position     INTEGER NOT NULL DEFAULT 0,
            created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    `);
}

/* ---------- Row <-> API shape ---------- */

// Convert a DB row into the exact project object the front end expects
// (identical to the old projects.json entries).
function rowToProject(row) {
    const content = row.content || {};
    const project = {
        slug: row.slug,
        title: row.title,
        tagline: row.tagline,
        thumb: row.thumb,
        detail: row.has_detail,
    };
    if (row.external_url) project.url = row.external_url;
    if (row.code_url) project.code_url = row.code_url;
    if (content.hero) project.hero = content.hero;
    if (content.blocks) project.blocks = content.blocks;
    return project;
}

// Convert an incoming project object (from admin) into columns + content jsonb.
function projectToRow(p) {
    return {
        slug: p.slug,
        title: p.title || "",
        tagline: p.tagline || "",
        thumb: p.thumb || "",
        has_detail: Boolean(p.detail),
        external_url: p.url || null,
        code_url: p.code_url || p.codeUrl || null,
        content: {
            hero: p.hero || undefined,
            blocks: p.blocks || undefined,
        },
    };
}

/* ---------- Reads ---------- */

// Read the seed JSON (fallback source).
function readSeed() {
    // Return a deep copy so callers can't mutate the shared bundled data.
    return structuredClone(seedData.projects);
}

// All projects in display order, in the front-end shape.
// Falls back to the seed JSON when there's no DB configured OR the DB read
// fails, so the public site never 500s because of a database hiccup.
export async function getAllProjects() {
    const p = getPool();
    if (!p) return readSeed();
    try {
        const { rows } = await p.query(
            `SELECT * FROM projects ORDER BY position ASC, id ASC`
        );
        // A configured-but-empty DB (not seeded yet) also falls back to JSON so
        // the site shows content until the first seed.
        if (rows.length === 0) return readSeed();
        return rows.map(rowToProject);
    } catch (err) {
        console.error("DB read failed, falling back to seed JSON:", err.message);
        return readSeed();
    }
}

export async function getProjectBySlug(slug) {
    const all = await getAllProjects();
    return all.find((x) => x.slug === slug) || null;
}

// Raw rows (with id/position) for the admin list.
export async function getAdminProjects() {
    const p = getPool();
    if (!p) {
        const all = await getAllProjects();
        return all.map((x, i) => ({ ...x, id: null, position: i }));
    }
    try {
        const { rows } = await p.query(
            `SELECT id, slug, title, tagline, thumb, has_detail, external_url,
                    code_url, content, position
             FROM projects ORDER BY position ASC, id ASC`
        );
        return rows.map((r) => ({ ...rowToProject(r), id: r.id, position: r.position }));
    } catch (err) {
        console.error("DB read failed (admin list):", err.message);
        const all = await getAllProjects();
        return all.map((x, i) => ({ ...x, id: null, position: i }));
    }
}

/* ---------- Writes (require DB) ---------- */

function requireDb() {
    const p = getPool();
    if (!p) throw new Error("No database configured (DATABASE_URL unset).");
    return p;
}

export async function createProject(project) {
    const p = requireDb();
    const r = projectToRow(project);
    const { rows: [{ max }] } = await p.query(
        `SELECT COALESCE(MAX(position), -1) AS max FROM projects`
    );
    const { rows } = await p.query(
        `INSERT INTO projects
            (slug, title, tagline, thumb, has_detail, external_url, code_url, content, position)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING *`,
        [r.slug, r.title, r.tagline, r.thumb, r.has_detail, r.external_url,
         r.code_url, r.content, max + 1]
    );
    return rowToProject(rows[0]);
}

export async function updateProject(slug, project) {
    const p = requireDb();
    const r = projectToRow(project);
    const { rows } = await p.query(
        `UPDATE projects SET
            slug=$1, title=$2, tagline=$3, thumb=$4, has_detail=$5,
            external_url=$6, code_url=$7, content=$8, updated_at=now()
         WHERE slug=$9
         RETURNING *`,
        [r.slug, r.title, r.tagline, r.thumb, r.has_detail, r.external_url,
         r.code_url, r.content, slug]
    );
    if (!rows.length) throw new Error(`Project not found: ${slug}`);
    return rowToProject(rows[0]);
}

export async function deleteProject(slug) {
    const p = requireDb();
    await p.query(`DELETE FROM projects WHERE slug=$1`, [slug]);
}

// Persist a new ordering: slugs in desired order.
export async function reorderProjects(slugs) {
    const p = requireDb();
    const client = await p.connect();
    try {
        await client.query("BEGIN");
        for (let i = 0; i < slugs.length; i++) {
            await client.query(`UPDATE projects SET position=$1 WHERE slug=$2`, [i, slugs[i]]);
        }
        await client.query("COMMIT");
    } catch (e) {
        await client.query("ROLLBACK");
        throw e;
    } finally {
        client.release();
    }
}

/* ---------- Seed ---------- */

// Load the seed JSON into an empty DB (idempotent: skips if rows exist).
export async function seedFromJson({ force = false } = {}) {
    const p = requireDb();
    await ensureSchema();
    if (!force) {
        const { rows: [{ count }] } = await p.query(`SELECT COUNT(*)::int AS count FROM projects`);
        if (count > 0) return { seeded: false, count };
    } else {
        await p.query(`TRUNCATE projects RESTART IDENTITY`);
    }
    const projects = readSeed();
    let i = 0;
    for (const proj of projects) {
        const r = projectToRow(proj);
        await p.query(
            `INSERT INTO projects
                (slug, title, tagline, thumb, has_detail, external_url, code_url, content, position)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [r.slug, r.title, r.tagline, r.thumb, r.has_detail, r.external_url,
             r.code_url, r.content, i++]
        );
    }
    return { seeded: true, count: projects.length };
}
