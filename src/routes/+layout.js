/* Canonicalize URLs to a trailing slash across the whole app.
 *
 * The nav data and several in-app links use trailing-slash paths (/resume/,
 * /projects/). SvelteKit's default is `trailingSlash: 'never'`, so those links
 * resolved to a 308 redirect to the slash-less route. During a client-side
 * navigation that mid-flight redirect stalls the router and the page appears to
 * freeze. Declaring 'always' here makes the slash the canonical form: the
 * router resolves links straight to it with no redirect round-trip, and any
 * slash-less URL is normalized to match. */
export const trailingSlash = "always";
