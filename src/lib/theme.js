/* theme.js — single source of truth for the site's editable theme.
 *
 * The theme is a small set of named colors. base.css defines matching
 * :root defaults so the site renders correctly with no database; when a
 * theme is saved in the DB, the root layout injects an inline <style> that
 * overrides those defaults with the stored values (see +layout.svelte).
 *
 * TOKENS is the schema the admin theme editor renders. Each token maps to a
 * CSS custom property (`--var`) used throughout the stylesheets. Keep this in
 * sync with the brand-palette + semantic aliases at the top of base.css.
 */

// Ordered list of editable colors. `var` is the CSS custom property name
// (without the leading --). `group` buckets them in the editor UI.
export const TOKENS = [
    // Brand palette (the six core colors).
    { key: "jungleGreen", var: "jungle-green", label: "Jungle Green (deepest)", group: "Brand palette" },
    { key: "seaweed",     var: "seaweed",      label: "Seaweed",               group: "Brand palette" },
    { key: "pine",        var: "pine",         label: "Pine",                  group: "Brand palette" },
    { key: "asparagus",   var: "asparagus",    label: "Asparagus",             group: "Brand palette" },
    { key: "curry",       var: "curry",        label: "Curry (accent)",        group: "Brand palette" },
    { key: "curryDark",   var: "curry-dark",   label: "Curry Dark",            group: "Brand palette" },

    // Page background — the full-page gradient wash behind every page.
    { key: "bgPageStart", var: "bg-page-start", label: "Page background (top)",    group: "Page background" },
    { key: "bgPageEnd",   var: "bg-page-end",   label: "Page background (bottom)", group: "Page background" },

    // Text colors (the semantic backgrounds derive from the palette above).
    { key: "text",        var: "text",         label: "Text",                  group: "Text" },
    { key: "textMuted",   var: "text-muted",   label: "Text (muted)",          group: "Text" },
    { key: "textOnAccent",var: "text-on-accent", label: "Text on accent",      group: "Text" },
];

// Default values — MUST match the :root declarations in base.css so that an
// unsaved (fallback) theme is identical to the stylesheet defaults.
export const DEFAULT_THEME = {
    jungleGreen: "#095256",
    seaweed: "#087F8C",
    pine: "#5AAA95",
    asparagus: "#86A873",
    curry: "#BB9F06",
    curryDark: "#D18804",
    bgPageStart: "#072325",
    bgPageEnd: "#061c1d",
    text: "#ffffff",
    textMuted: "#e6e6e6",
    textOnAccent: "#ffffff",
};

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

// Merge a partial/untrusted theme object onto the defaults, keeping only
// known keys with valid hex colors. Always returns a complete theme.
export function normalizeTheme(input) {
    const out = { ...DEFAULT_THEME };
    if (input && typeof input === "object") {
        for (const { key } of TOKENS) {
            const v = input[key];
            if (typeof v === "string" && HEX.test(v.trim())) {
                out[key] = v.trim().toLowerCase();
            }
        }
    }
    return out;
}

// Build the inline CSS that overrides base.css :root defaults with a theme.
// Only emits the raw palette vars; the semantic aliases in base.css reference
// these via var(), so overriding the palette re-themes everything downstream.
export function themeToCss(theme) {
    const t = normalizeTheme(theme);
    const lines = TOKENS.map(({ key, var: v }) => `--${v}: ${t[key]};`);
    return `:root{${lines.join("")}}`;
}
