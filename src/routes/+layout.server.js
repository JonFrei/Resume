/* Root layout load — provides the asset base URL to every page (SSR + client). */
import { ASSET_BASE_URL } from "$lib/server/config.js";

export const load = () => ({ assetBase: ASSET_BASE_URL });
