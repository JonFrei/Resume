/* Root layout load — provides the asset base URL + active theme to every page
 * (SSR + client). The theme is injected as inline CSS by the root layout so the
 * whole site (public + admin) reflects saved color changes. */
import { ASSET_BASE_URL } from "$lib/server/config.js";
import { getTheme } from "$lib/server/db.js";

export const load = async () => ({
    assetBase: ASSET_BASE_URL,
    theme: await getTheme(),
});
