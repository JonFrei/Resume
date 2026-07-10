/* resumeForm.js — parse + validate the admin resume form payload.
 * Like projectForm.js, the editor posts a single JSON string field `payload`
 * (the whole resume object assembled client-side), preserving the nested
 * skills/experience shape without a flat form encoding. */

import { RESUME_FONTS, RESUME_FONT_KEYS } from "$lib/resumeFonts.js";

// Validate a font key against the known set; anything else becomes the default.
function normalizeFont(v) {
    const k = String(v || "").trim();
    return RESUME_FONT_KEYS.has(k) ? k : RESUME_FONTS[0].key;
}

function slugify(s) {
    return String(s)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

// Accept an array of strings, or a textarea (one item per line).
function splitLines(v) {
    if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
    return String(v || "")
        .split(/\n/)
        .map((s) => s.trim())
        .filter(Boolean);
}

// A skills item is either a plain string or { text, tag }.
function normalizeSkillItem(item) {
    if (item && typeof item === "object") {
        const text = String(item.text || "").trim();
        const tag = String(item.tag || "").trim();
        if (!text) return null;
        return tag ? { text, tag } : text;
    }
    const s = String(item || "").trim();
    return s || null;
}

function normalizeSkillsGroup(g) {
    const heading = String(g?.heading || "").trim();
    const items = (Array.isArray(g?.items) ? g.items : [])
        .map(normalizeSkillItem)
        .filter(Boolean);
    const group = { heading, items };
    if (g?.style === "tags") group.style = "tags";
    return group;
}

// Parse a year to an integer, or null. Accepts numbers and strings; a blank
// or non-numeric value (e.g. "Present") becomes null (open-ended / unknown).
function toYear(v) {
    if (v === null || v === undefined || v === "") return null;
    const n = parseInt(String(v).trim(), 10);
    return Number.isFinite(n) ? n : null;
}

function normalizeRole(r) {
    return {
        title: String(r?.title || "").trim(),
        dates: String(r?.dates || "").trim(),
        start: toYear(r?.start),
        end: toYear(r?.end),
        points: splitLines(r?.points),
    };
}

function normalizeEducation(e, index) {
    const school = String(e?.school || "").trim();
    let id = slugify(e?.id || "");
    if (!id) id = `edu-${slugify(school) || index}`;
    return {
        id,
        school,
        credential: String(e?.credential || "").trim(),
        dates: String(e?.dates || "").trim(),
        start: toYear(e?.start),
        end: toYear(e?.end),
        points: splitLines(e?.points),
    };
}

// A header link is { label, href }. Empty entries are dropped by the caller.
function normalizeLink(l) {
    return {
        label: String(l?.label || "").trim(),
        // Strip ALL whitespace: the href is edited in a wrapping textarea, so a
        // stray newline/space (URLs contain neither) must not corrupt the link.
        href: String(l?.href || "").replace(/\s+/g, ""),
    };
}

// The resume header: identity + contact line shown at the top of the print
// (and any future header-bearing) layout. All fields optional so a partial
// header still renders cleanly.
function normalizeHeading(h) {
    const links = (Array.isArray(h?.links) ? h.links : [])
        .map(normalizeLink)
        .filter((l) => l.label || l.href);
    return {
        name: String(h?.name || "").trim(),
        title: String(h?.title || "").trim(),
        email: String(h?.email || "").trim(),
        phone: String(h?.phone || "").trim(),
        location: String(h?.location || "").trim(),
        font: normalizeFont(h?.font),
        links,
    };
}

function normalizeJob(j, index) {
    const company = String(j?.company || "").trim();
    // Keep a stable anchor id; derive from company if missing so in-page
    // links (#exp-...) and the jump nav keep working.
    let id = slugify(j?.id || "");
    if (!id) id = `exp-${slugify(company) || index}`;
    const roles = (Array.isArray(j?.roles) ? j.roles : [])
        .map(normalizeRole)
        .filter((r) => r.title || r.dates || r.points.length);
    return { id, company, roles };
}

function parseJson(raw) {
    try {
        return { data: JSON.parse(raw) };
    } catch {
        return { error: "Invalid form data." };
    }
}

// Parse just the resume CONTENT (skills + experience + education) from the Web
// editor payload. The header is edited separately (Export tab), so it is NOT
// touched here — callers merge this onto the stored resume. Returns { content }
// or { error }.
export function parseResumeContent(raw) {
    const { data, error } = parseJson(raw);
    if (error) return { error };

    const skills = (Array.isArray(data.skills) ? data.skills : [])
        .map(normalizeSkillsGroup)
        .filter((g) => g.heading || g.items.length);

    const experience = (Array.isArray(data.experience) ? data.experience : [])
        .map(normalizeJob)
        .filter((j) => j.company || j.roles.length);

    const education = (Array.isArray(data.education) ? data.education : [])
        .map(normalizeEducation)
        .filter((e) => e.school || e.credential || e.points.length);

    return { content: { skills, experience, education } };
}

// Parse just the resume HEADER (identity + contact) from the Export editor
// payload. Content is edited separately (Web tab), so it is NOT touched here.
// Returns { heading } or { error }.
export function parseResumeHeading(raw) {
    const { data, error } = parseJson(raw);
    if (error) return { error };
    return { heading: normalizeHeading(data.heading) };
}

// Parse a FULL resume payload ({ heading, skills, experience, education }).
// Retained for any caller that assembles the whole resume at once. Returns
// { resume } or { error }.
export function parseResumePayload(raw) {
    const { content, error } = parseResumeContent(raw);
    if (error) return { error };
    const { heading } = parseResumeHeading(raw);
    return { resume: { heading, ...content } };
}
