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

function normalizeRole(r) {
    return {
        title: String(r?.title || "").trim(),
        dates: String(r?.dates || "").trim(),
        points: splitLines(r?.points),
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

    const skills = (Array.isArray(data.skills) ? data.skills : [])
        .map(normalizeSkillsGroup)
        .filter((g) => g.heading || g.items.length);

    const experience = (Array.isArray(data.experience) ? data.experience : [])
        .map(normalizeJob)
        .filter((j) => j.company || j.roles.length);

    return { resume: { skills, experience } };
}
