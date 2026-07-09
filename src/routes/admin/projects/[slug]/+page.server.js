import { fail, redirect, error } from "@sveltejs/kit";
import { parseProjectPayload } from "$lib/server/projectForm.js";
import { getProjectBySlug, updateProject } from "$lib/server/db.js";
import { hasDatabase } from "$lib/server/config.js";

export const load = async ({ params }) => {
    const project = await getProjectBySlug(params.slug);
    if (!project) throw error(404, "Project not found");
    return { project };
};

export const actions = {
    default: async ({ request, params }) => {
        if (!hasDatabase) return fail(400, { error: "No database configured." });

        const data = await request.formData();
        const { project, error: parseErr } = parseProjectPayload(data.get("payload"));
        if (parseErr) return fail(400, { error: parseErr });

        // Slug is fixed on edit; ignore any client change.
        project.slug = params.slug;

        try {
            await updateProject(params.slug, project);
        } catch (e) {
            return fail(500, { error: e.message });
        }
        throw redirect(303, "/admin");
    },
};
