/* resumeFonts.js — the professional font choices offered on the admin Export
 * tab. Kept OUT of $lib/server so both the client editor/preview and the
 * printable page can import it (SvelteKit forbids importing $lib/server modules
 * into client code). The server-side resumeForm.js re-exports these for its
 * header normalization. */

// Each entry maps a stable key (stored on the resume header) to a display label
// and a CSS font-family stack of web-safe system fonts, so the printed PDF
// renders identically without any web-font download. RESUME_FONTS[0] is the
// default when none is chosen.
export const RESUME_FONTS = [
    { key: "helvetica", label: "Helvetica / Arial (sans-serif)", stack: '"Helvetica Neue", Arial, system-ui, sans-serif' },
    { key: "calibri", label: "Calibri (sans-serif)", stack: 'Calibri, "Segoe UI", system-ui, sans-serif' },
    { key: "georgia", label: "Georgia (serif)", stack: 'Georgia, "Times New Roman", Times, serif' },
    { key: "garamond", label: "Garamond (serif)", stack: 'Garamond, "EB Garamond", "Palatino Linotype", Palatino, serif' },
    { key: "times", label: "Times New Roman (serif)", stack: '"Times New Roman", Times, serif' },
    { key: "cambria", label: "Cambria (serif)", stack: 'Cambria, Georgia, "Times New Roman", serif' },
];

export const RESUME_FONT_KEYS = new Set(RESUME_FONTS.map((f) => f.key));

// Resolve a stored font key to its CSS font-family stack, falling back to the
// default when the key is missing or unrecognized.
export function resumeFontStack(key) {
    const found = RESUME_FONTS.find((f) => f.key === key);
    return (found || RESUME_FONTS[0]).stack;
}
