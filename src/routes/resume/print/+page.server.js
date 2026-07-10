/* Printable resume — same content as /resume, but a single-column, letter-sized
 * layout tuned for Print → "Save as PDF". No timeline, no site nav/footer. */
import { getResume } from "$lib/server/db.js";

export const load = async () => ({ resume: await getResume() });
