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
    // Brand palette (the six core colors). Keys keep their historical names for
    // backward-compatible CSS vars + stored themes; labels describe the current
    // "Slate & Copper" identity (slate ground ramp + copper accent).
    { key: "jungleGreen", var: "jungle-green", label: "Slate (deepest ground)", group: "Brand palette" },
    { key: "seaweed",     var: "seaweed",      label: "Slate (mid)",           group: "Brand palette" },
    { key: "pine",        var: "pine",         label: "Slate (light surface)", group: "Brand palette" },
    { key: "asparagus",   var: "asparagus",    label: "Slate (spare / unused)", group: "Brand palette" },
    { key: "curry",       var: "curry",        label: "Copper (accent)",       group: "Brand palette" },
    { key: "curryDark",   var: "curry-dark",   label: "Copper Dark",           group: "Brand palette" },

    // Page background — the full-page gradient wash behind every page.
    { key: "bgPageStart", var: "bg-page-start", label: "Page background (top)",    group: "Page background" },
    { key: "bgPageEnd",   var: "bg-page-end",   label: "Page background (bottom)", group: "Page background" },

    // Text colors (the semantic backgrounds derive from the palette above).
    { key: "text",         var: "text",          label: "Text",                    group: "Text" },
    { key: "textMuted",    var: "text-muted",    label: "Text (muted)",            group: "Text" },
    { key: "textOnAccent", var: "text-on-accent", label: "Text on accent",         group: "Text" },
    { key: "textSecondary",var: "text-secondary", label: "Text (secondary, on dark)", group: "Text" },
    { key: "textHeading",  var: "text-heading",  label: "Heading (on dark panels)", group: "Text" },
];

// Default values — MUST match the :root declarations in base.css so that an
// unsaved (fallback) theme is identical to the stylesheet defaults.
export const DEFAULT_THEME = {
    jungleGreen: "#161b1f",
    seaweed: "#232b31",
    pine: "#2b333a",
    asparagus: "#3a444c",
    curry: "#c2703d",
    curryDark: "#a85c2e",
    bgPageStart: "#12171a",
    bgPageEnd: "#0f1316",
    text: "#ffffff",
    textMuted: "#e6e6e6",
    textOnAccent: "#160f0a",
    textSecondary: "#b9c4ca",
    textHeading: "#d9e1e6",
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
