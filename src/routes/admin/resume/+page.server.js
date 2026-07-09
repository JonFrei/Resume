import { fail } from "@sveltejs/kit";
import { getResume, saveResume } from "$lib/server/db.js";
import { parseResumePayload } from "$lib/server/resumeForm.js";
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
        const { resume, error } = parseResumePayload(data.get("payload"));
        if (error) return fail(400, { error });

        try {
            await saveResume(resume);
        } catch (e) {
            return fail(500, { error: e.message });
        }
        return { saved: true };
    },
};
