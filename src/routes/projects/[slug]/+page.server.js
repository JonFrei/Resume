import { error } from "@sveltejs/kit";
import { getProjectBySlug } from "$lib/server/db.js";

export const load = async ({ params }) => {
    const project = await getProjectBySlug(params.slug);
    if (!project || !project.detail) {
        throw error(404, "Project not found");
    }
    return { project };
};
