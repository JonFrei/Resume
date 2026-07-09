import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess(),
    kit: {
        adapter: adapter(),
        // The app serves two origins (main site + admin subdomain), so
        // SvelteKit's single-origin CSRF check can't cover both and would block
        // admin form POSTs behind the proxy. Disable it and rely instead on the
        // SameSite=lax, httpOnly signed session cookie: cross-site POSTs can't
        // carry that cookie, and every admin write requires it.
        csrf: { checkOrigin: false },
    },
};

export default config;
