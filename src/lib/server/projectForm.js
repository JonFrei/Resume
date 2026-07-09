/* projectForm.js — parse + validate the admin project form payload.
 * The form posts a single JSON string field `payload` (the whole project
 * object assembled client-side), which keeps the nested block structure intact
 * without inventing a flat form encoding. */

function slugify(s) {
    return String(s)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

// Parse and normalize; returns { project } or { error }.
export function parseProjectPayload(raw) {
    let data;
    try {
        data = JSON.parse(raw);
    } catch {
        return { error: "Invalid form data." };
    }

    const title = String(data.title || "").trim();
    if (!title) return { error: "Title is required." };

    let slug = slugify(data.slug || title);
    if (!slug) return { error: "Could not derive a slug from the title." };

    const detail = Boolean(data.detail);

    const project = {
        slug,
        title,
        tagline: String(data.tagline || "").trim(),
        thumb: String(data.thumb || "").trim(),
        detail,
    };

    const url = String(data.url || "").trim();
    if (url) project.url = url;

    const codeUrl = String(data.code_url || data.codeUrl || "").trim();
    if (codeUrl) project.code_url = codeUrl;

    if (detail) {
        // Hero
        const heroLead = String(data.hero?.lead || "").trim();
        const gallery = Array.isArray(data.hero?.gallery)
            ? data.hero.gallery
                  .filter((g) => g && g.src)
                  .map((g) => ({ src: String(g.src).trim(), alt: String(g.alt || "").trim() }))
            : [];
        if (heroLead || gallery.length) {
            project.hero = {};
            if (heroLead) project.hero.lead = heroLead;
            if (gallery.length) project.hero.gallery = gallery;
        }

        // Blocks
        const blocks = Array.isArray(data.blocks) ? data.blocks : [];
        project.blocks = blocks
            .map((b) => normalizeBlock(b))
            .filter((b) => b.heading || (b.body && b.body.length) || (b.media && b.media.length));
    }

    return { project };
}

function normalizeBlock(b) {
    const block = {
        heading: String(b.heading || "").trim(),
        layout: ["left", "right", "full"].includes(b.layout) ? b.layout : "left",
    };

    const body = splitParas(b.body);
    if (body.length) block.body = body;

    const bodyAfter = splitParas(b.bodyAfter);
    if (bodyAfter.length) block.bodyAfter = bodyAfter;

    const listItems = splitLines(b.list?.items);
    if (listItems.length) {
        block.list = { ordered: Boolean(b.list?.ordered), items: listItems };
    }

    const media = Array.isArray(b.media)
        ? b.media
              .filter((m) => m && m.src)
              .map((m) => ({ src: String(m.src).trim(), alt: String(m.alt || "").trim() }))
        : [];
    if (media.length) {
        block.media = media;
        if (b.mediaRow) block.mediaRow = true;
    }

    return block;
}

// Accept either an array of strings or a textarea (blank-line separated).
function splitParas(v) {
    if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
    return String(v || "")
        .split(/\n\s*\n/)
        .map((s) => s.trim())
        .filter(Boolean);
}

// Accept either an array or a textarea (one item per line).
function splitLines(v) {
    if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
    return String(v || "")
        .split(/\n/)
        .map((s) => s.trim())
        .filter(Boolean);
}
