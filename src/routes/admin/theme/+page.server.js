import { fail } from "@sveltejs/kit";
import { getTheme, saveTheme } from "$lib/server/db.js";
import { hasDatabase } from "$lib/server/config.js";
import { normalizeTheme } from "$lib/theme.js";

export const load = async () => ({
    theme: await getTheme(),
    hasDatabase,
});

export const actions = {
    default: async ({ request }) => {
        if (!hasDatabase)
            return fail(400, { error: "No database configured — theme changes can't be saved." });

        const data = await request.formData();
        let parsed;
        try {
            parsed = JSON.parse(data.get("payload"));
        } catch {
            return fail(400, { error: "Invalid form data." });
        }

        const theme = normalizeTheme(parsed);
        try {
            await saveTheme(theme);
        } catch (e) {
            return fail(500, { error: e.message });
        }
        return { saved: true, theme };
    },
};
