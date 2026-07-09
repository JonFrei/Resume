/* upload-r2.mjs — push assets/img/** to a Cloudflare R2 bucket.
 *
 * R2 is S3-compatible, so we use the AWS S3 client pointed at R2's endpoint.
 * Keys mirror the local path under assets/ (e.g. assets/img/project-1.png),
 * so the same "/assets/img/..." paths in the JSON resolve on the CDN once
 * ASSET_BASE_URL points at your R2 custom domain.
 *
 * Usage:
 *   1. Fill in the R2 env vars (see .env.example / SETUP.md).
 *   2. npm install            (installs @aws-sdk/client-s3, a devDependency)
 *   3. npm run upload:r2       (add --dry-run to preview without uploading)
 *
 * Required env vars:
 *   R2_ACCOUNT_ID          Cloudflare account ID
 *   R2_ACCESS_KEY_ID       R2 API token access key
 *   R2_SECRET_ACCESS_KEY   R2 API token secret
 *   R2_BUCKET              target bucket name (e.g. "jonfrei-assets")
 * Optional:
 *   R2_ENDPOINT            override endpoint (defaults to the account R2 URL)
 *   R2_PREFIX              key prefix (default "assets/") — keep in sync with JSON paths
 */

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
    S3Client,
    PutObjectCommand,
    HeadBucketCommand,
} from "@aws-sdk/client-s3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const IMG_DIR = path.join(ROOT, "assets", "img");

const DRY_RUN = process.argv.includes("--dry-run");

const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET,
    R2_ENDPOINT,
    R2_PREFIX = "assets/",
} = process.env;

const CONTENT_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".avif": "image/avif",
    ".ico": "image/x-icon",
};

function requireEnv() {
    const missing = [];
    if (!R2_ACCOUNT_ID) missing.push("R2_ACCOUNT_ID");
    if (!R2_ACCESS_KEY_ID) missing.push("R2_ACCESS_KEY_ID");
    if (!R2_SECRET_ACCESS_KEY) missing.push("R2_SECRET_ACCESS_KEY");
    if (!R2_BUCKET) missing.push("R2_BUCKET");
    if (missing.length) {
        console.error(`Missing env vars: ${missing.join(", ")}`);
        console.error("See SETUP.md for how to create an R2 bucket + API token.");
        process.exit(1);
    }
}

// Recursively list files under a directory, returning absolute paths.
async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
        entries.map(async (entry) => {
            const full = path.join(dir, entry.name);
            return entry.isDirectory() ? walk(full) : [full];
        })
    );
    return files.flat();
}

// Convert an absolute file path into an R2 object key.
// e.g. <root>/assets/img/project-1.png  ->  assets/img/project-1.png
function toKey(absPath) {
    const relFromImg = path.relative(IMG_DIR, absPath).split(path.sep).join("/");
    const prefix = R2_PREFIX.replace(/\/?$/, "/"); // ensure single trailing slash
    return `${prefix}img/${relFromImg}`;
}

async function main() {
    // Confirm there are images to upload before requiring credentials.
    try {
        await stat(IMG_DIR);
    } catch {
        console.error(`No image directory found at ${IMG_DIR}`);
        process.exit(1);
    }

    const files = await walk(IMG_DIR);
    if (!files.length) {
        console.log("No images found under assets/img — nothing to upload.");
        return;
    }

    console.log(`Found ${files.length} image(s) under assets/img`);
    if (DRY_RUN) {
        console.log("\n--dry-run: the following keys WOULD be uploaded:\n");
        for (const f of files) console.log(`  ${toKey(f)}`);
        console.log(`\nBucket: ${R2_BUCKET || "(unset)"}  Prefix: ${R2_PREFIX}`);
        return;
    }

    requireEnv();

    const endpoint =
        R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

    const s3 = new S3Client({
        region: "auto",
        endpoint,
        credentials: {
            accessKeyId: R2_ACCESS_KEY_ID,
            secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
    });

    // Fail fast with a clear message if the bucket/creds are wrong.
    try {
        await s3.send(new HeadBucketCommand({ Bucket: R2_BUCKET }));
    } catch (err) {
        console.error(`Could not access bucket "${R2_BUCKET}" at ${endpoint}`);
        console.error(err.message || err);
        process.exit(1);
    }

    let uploaded = 0;
    for (const file of files) {
        const key = toKey(file);
        const ext = path.extname(file).toLowerCase();
        const body = await readFile(file);

        await s3.send(
            new PutObjectCommand({
                Bucket: R2_BUCKET,
                Key: key,
                Body: body,
                ContentType: CONTENT_TYPES[ext] || "application/octet-stream",
                // Images are content-addressed by name; cache them hard at the edge.
                CacheControl: "public, max-age=31536000, immutable",
            })
        );

        uploaded += 1;
        console.log(`  ↑ ${key}`);
    }

    console.log(`\nDone. Uploaded ${uploaded}/${files.length} image(s) to "${R2_BUCKET}".`);
    console.log(
        "Next: set ASSET_BASE_URL (e.g. https://cdn.jonathan-freier.com) on Railway."
    );
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
