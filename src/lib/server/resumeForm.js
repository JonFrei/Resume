/* resumeForm.js — parse + validate the admin resume form payload.
 * Like projectForm.js, the editor posts a single JSON string field `payload`
 * (the whole resume object assembled client-side), preserving the nested
 * skills/experience shape without a flat form encoding. */

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
        href: String(l?.href || "").trim(),
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

// Parse and normalize; returns { resume } or { error }.
export function parseResumePayload(raw) {
    let data;
    try {
        data = JSON.parse(raw);
    } catch {
        return { error: "Invalid form data." };
    }

    const heading = normalizeHeading(data.heading);

    const skills = (Array.isArray(data.skills) ? data.skills : [])
        .map(normalizeSkillsGroup)
        .filter((g) => g.heading || g.items.length);

    const experience = (Array.isArray(data.experience) ? data.experience : [])
        .map(normalizeJob)
        .filter((j) => j.company || j.roles.length);

    const education = (Array.isArray(data.education) ? data.education : [])
        .map(normalizeEducation)
        .filter((e) => e.school || e.credential || e.points.length);

    return { resume: { heading, skills, experience, education } };
}
