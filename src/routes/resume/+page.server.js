/* Resume page load — serves the resume content from the DB (or seed fallback). */
import { getResume } from "$lib/server/db.js";

export const load = async () => ({ resume: await getResume() });
