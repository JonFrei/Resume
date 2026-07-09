import { fail } from "@sveltejs/kit";
import { getAdminProjects, deleteProject } from "$lib/server/db.js";
import { hasDatabase } from "$lib/server/config.js";

export const load = async () => {
    const projects = await getAdminProjects();
    return { projects, hasDatabase };
};

export const actions = {
    delete: async ({ request }) => {
        if (!hasDatabase) return fail(400, { error: "No database configured." });
        const data = await request.formData();
        const slug = String(data.get("slug") || "");
        if (!slug) return fail(400, { error: "Missing slug." });
        try {
            await deleteProject(slug);
            return { deleted: slug };
        } catch (e) {
            return fail(500, { error: e.message });
        }
    },
};
