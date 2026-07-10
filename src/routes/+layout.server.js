/* Root layout load — provides the asset base URL + active theme to every page
 * (SSR + client). The theme is injected as inline CSS by the root layout so the
 * whole site (public + admin) reflects saved color changes. */
import { ASSET_BASE_URL, PUBLIC_SITE_URL } from "$lib/server/config.js";
import { getTheme } from "$lib/server/db.js";

export const load = async () => ({
    assetBase: ASSET_BASE_URL,
    // Absolute origin of the public site, used by admin pages to link to public
    // routes (empty on local dev where admin + site share a host).
    siteUrl: PUBLIC_SITE_URL,
    theme: await getTheme(),
});
