/* hash-password.mjs — generate an argon2 hash for the admin password.
 *
 * Usage:
 *   node scripts/hash-password.mjs "your-strong-password"
 *
 * Copy the printed hash into ADMIN_PASSWORD_HASH (Railway variable / .env).
 * The plain password is never stored anywhere.
 */

import { hash } from "@node-rs/argon2";

const password = process.argv[2];

if (!password) {
    console.error('Usage: node scripts/hash-password.mjs "your-password"');
    process.exit(1);
}
if (password.length < 8) {
    console.error("Please choose a password of at least 8 characters.");
    process.exit(1);
}

const digest = await hash(password, {
    // OWASP-ish argon2id defaults; solid for a single-admin login.
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
});

console.log("\nADMIN_PASSWORD_HASH=" + digest + "\n");
console.log("Set that as the ADMIN_PASSWORD_HASH env var (Railway / .env).");
