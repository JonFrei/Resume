/* Export sub-tab: edit the resume HEADER and preview the printable PDF. Shares
 * the resume blob with the Web tab; saving here parses ONLY the header and
 * merges it onto the stored resume so the Web tab's content is preserved. */
import { fail } from "@sveltejs/kit";
import { getResume, saveResume } from "$lib/server/db.js";
import { parseResumeHeading } from "$lib/server/resumeForm.js";
import { hasDatabase } from "$lib/server/config.js";

export const load = async () => ({
    resume: await getResume(),
    hasDatabase,
});

export const actions = {
    default: async ({ request }) => {
        if (!hasDatabase)
            return fail(400, { error: "No database configured — resume changes can't be saved." });

        const data = await request.formData();
        const { heading, error } = parseResumeHeading(data.get("payload"));
        if (error) return fail(400, { error });

        try {
            const current = await getResume();
            await saveResume({ ...current, heading });
        } catch (e) {
            return fail(500, { error: e.message });
        }
        return { saved: true };
    },
};
