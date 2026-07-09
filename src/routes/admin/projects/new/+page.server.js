import { fail, redirect } from "@sveltejs/kit";
import { parseProjectPayload } from "$lib/server/projectForm.js";
import { createProject, getProjectBySlug } from "$lib/server/db.js";
import { hasDatabase } from "$lib/server/config.js";

export const actions = {
    default: async ({ request }) => {
        if (!hasDatabase) return fail(400, { error: "No database configured." });

        const data = await request.formData();
        const { project, error } = parseProjectPayload(data.get("payload"));
        if (error) return fail(400, { error });

        if (await getProjectBySlug(project.slug)) {
            return fail(400, { error: `A project with slug “${project.slug}” already exists.` });
        }

        try {
            await createProject(project);
        } catch (e) {
            return fail(500, { error: e.message });
        }
        throw redirect(303, "/admin");
    },
};
