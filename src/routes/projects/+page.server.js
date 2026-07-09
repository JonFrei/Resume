/* Projects grid data — from the DB (falls back to seed JSON without a DB). */
import { getAllProjects } from "$lib/server/db.js";

export const load = async () => {
    const projects = await getAllProjects();
    return { projects };
};
