/* seed-db.mjs — create the projects table and load static/data/projects.json.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/seed-db.mjs           (skips if rows exist)
 *   DATABASE_URL=... node scripts/seed-db.mjs --force    (wipes + reseeds)
 *
 * On Railway you can run this from the service shell, or it runs automatically:
 * the app ensures the schema on boot, and the admin "Seed" is a no-op if the
 * table already has rows. This script is the explicit/CLI path.
 */

import { seedFromJson } from "../src/lib/server/db.js";
import { hasDatabase } from "../src/lib/server/config.js";

if (!hasDatabase) {
    console.error("DATABASE_URL is not set — nothing to seed.");
    process.exit(1);
}

const force = process.argv.includes("--force");

try {
    const result = await seedFromJson({ force });
    if (result.seeded) {
        console.log(`Seeded ${result.count} project(s) into the database.`);
    } else {
        console.log(`Database already has ${result.count} project(s); skipped (use --force to reseed).`);
    }
    process.exit(0);
} catch (err) {
    console.error("Seed failed:", err.message);
    process.exit(1);
}
