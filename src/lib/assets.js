/* assets.js — resolve an image path against the ASSET_BASE_URL.
 * The base is provided by the root layout load (from server config) and passed
 * in explicitly so this stays a pure function usable during SSR and on the
 * client. Absolute URLs and non-asset paths pass through unchanged. */

export function assetUrl(src, base = "") {
    if (!src) return src;
    if (/^https?:\/\//i.test(src)) return src;
    if (!base) return src;
    if (src.startsWith("/assets/")) return base.replace(/\/$/, "") + src;
    return src;
}
