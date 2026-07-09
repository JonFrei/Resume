/* autogrow.js — Svelte action that keeps a <textarea> sized to its content, so
 * inline-editable text in the "edit in place" editors reads like flowing page
 * copy rather than a fixed-height box. Usage: <textarea use:autogrow />. */
export function autogrow(node) {
    const resize = () => {
        node.style.height = "auto";
        node.style.height = node.scrollHeight + "px";
    };
    resize();
    node.addEventListener("input", resize);
    // Re-measure when the value is set programmatically (e.g. on load).
    const observer = new MutationObserver(resize);
    observer.observe(node, { attributes: true, attributeFilter: ["value"] });
    return {
        update: resize,
        destroy() {
            node.removeEventListener("input", resize);
            observer.disconnect();
        },
    };
}
