/* GET /data/projects.json — serves projects from the DB in the original shape.
 * Kept for backward compatibility (and any external consumer of the old
 * static file). The public site now uses SSR loads, but this endpoint mirrors
 * the pre-Phase-4 static JSON. */
import { json } from "@sveltejs/kit";
import { getAllProjects } from "$lib/server/db.js";

export const GET = async () => {
    const projects = await getAllProjects();
    return json({ projects }, { headers: { "cache-control": "no-cache" } });
};
