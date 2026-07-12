/* resumeSkills.js — shared skills-layout logic for the resume renderers.
 *
 * Three surfaces render the skills section from the same data: the live
 * /resume page, the printable /resume/print page, and the admin editor preview.
 * The rules for turning (skills, skillsLayout, skillsBands) into an ordered list
 * of render "blocks" live here so those surfaces can't drift apart.
 *
 * A BLOCK is one contiguous run rendered with a single layout:
 *   { layout: "row" | "columns", groups: [{ ...group, index }] }
 * - Bands come first, in their saved order, each as one block.
 * - Every group not claimed by a band is collected, in original order, into a
 *   trailing block using the section default layout (skillsLayout).
 * - "rows" (the section default keyword) maps to the per-block layout "row".
 */

// Normalize the section default keyword ("rows"/"columns") to a block layout.
function defaultBlockLayout(skillsLayout) {
    return skillsLayout === "columns" ? "columns" : "row";
}

// Build the ordered list of render blocks. Pure; safe to call reactively.
// `skills` is the (already-filtered) group array; `bands` is normalized
// (indices in range, no dupes) as produced by resumeForm.normalizeSkillsBands.
export function buildSkillBlocks(skills, skillsLayout, bands) {
    const groups = Array.isArray(skills) ? skills : [];
    const bandList = Array.isArray(bands) ? bands : [];

    const claimed = new Set();
    const blocks = [];

    for (const band of bandList) {
        const inBand = [];
        for (const i of band.groups || []) {
            if (i < 0 || i >= groups.length || claimed.has(i)) continue;
            claimed.add(i);
            inBand.push({ ...groups[i], index: i });
        }
        if (inBand.length) {
            blocks.push({ layout: band.layout === "columns" ? "columns" : "row", groups: inBand });
        }
    }

    // Leftover groups (not in any band), in original order, as one trailing
    // block in the section default layout.
    const leftover = [];
    for (let i = 0; i < groups.length; i++) {
        if (!claimed.has(i)) leftover.push({ ...groups[i], index: i });
    }
    if (leftover.length) {
        blocks.push({ layout: defaultBlockLayout(skillsLayout), groups: leftover });
    }

    return blocks;
}

// Items past this count in a COLUMN group flow into a second sub-column so a
// tall group gets shorter. Kept here so the live page and print agree.
export const SUBCOLUMN_THRESHOLD = 6;

// How many sub-columns a column group's item list should flow into.
export function subColumnCount(itemCount) {
    return itemCount > SUBCOLUMN_THRESHOLD ? 2 : 1;
}
