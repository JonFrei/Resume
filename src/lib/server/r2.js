/* r2.js — server-side image upload to Cloudflare R2 (admin uploads).
 * Uses the SERVER's own R2 credentials (see config.R2), which are a separate
 * token from the local upload script. Keys are stored under the same
 * "assets/img/..." prefix the public paths use, so an uploaded image is
 * reachable at ASSET_BASE_URL + "/assets/img/<key>". */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { R2, canUploadToR2 } from "./config.js";

const CONTENT_TYPES = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    avif: "image/avif",
    svg: "image/svg+xml",
};

let client = null;
function getClient() {
    if (!canUploadToR2) throw new Error("R2 is not configured on the server.");
    if (!client) {
        client = new S3Client({
            region: "auto",
            endpoint: R2.endpoint,
            credentials: {
                accessKeyId: R2.accessKeyId,
                secretAccessKey: R2.secretAccessKey,
            },
        });
    }
    return client;
}

// Sanitize a filename into a safe key segment.
function safeName(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

/*
 * Upload a Buffer to R2 under assets/img/<folder>/<name>.
 * Returns the PUBLIC PATH (e.g. "/assets/img/redd-robot/foo.png") to store in
 * the project — the renderer prepends ASSET_BASE_URL to it.
 */
export async function uploadImage({ buffer, filename, folder = "", contentType }) {
    const ext = (filename.split(".").pop() || "").toLowerCase();
    const base = safeName(filename.replace(/\.[^.]+$/, "")) || "image";
    // Prefix with a short random token to avoid collisions/overwrites.
    const token = Math.random().toString(36).slice(2, 8);
    const cleanFolder = folder ? safeName(folder) + "/" : "";
    const objectName = `${cleanFolder}${base}-${token}.${ext}`;

    const key = `${R2.prefix.replace(/\/?$/, "/")}img/${objectName}`;
    const type = contentType || CONTENT_TYPES[ext] || "application/octet-stream";

    await getClient().send(
        new PutObjectCommand({
            Bucket: R2.bucket,
            Key: key,
            Body: buffer,
            ContentType: type,
            CacheControl: "public, max-age=31536000, immutable",
        })
    );

    // Public path mirrors the key minus the R2 prefix, rooted at /assets/img.
    return `/assets/img/${objectName}`;
}
