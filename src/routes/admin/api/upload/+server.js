import { json } from "@sveltejs/kit";
import { uploadImage, CONTENT_TYPES } from "$lib/server/r2.js";
import { canUploadToR2 } from "$lib/server/config.js";

// NOTE: adapter-node's BODY_SIZE_LIMIT (default 512K) is enforced on the raw
// request BEFORE this handler runs. Set BODY_SIZE_LIMIT above MAX_BYTES in the
// deploy env (see .env.example), or large uploads 413 before this check runs.
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

// Browsers sometimes report a generic/empty type (application/octet-stream) for
// a perfectly valid image — depends on OS MIME registration, extension, etc.
// So resolve the type from the reported MIME first, then fall back to the file
// extension, and validate that. Returns "" if neither yields a known image.
function resolveImageType(file) {
    const reported = (file.type || "").toLowerCase();
    if (Object.values(CONTENT_TYPES).includes(reported)) return reported;
    const ext = (file.name || "").split(".").pop()?.toLowerCase() || "";
    return CONTENT_TYPES[ext] || "";
}

export const POST = async ({ request, locals }) => {
    // Endpoints don't run layout guards — check auth here.
    if (!locals.authed) return json({ error: "Unauthorized" }, { status: 401 });

    if (!canUploadToR2) {
        return json(
            { error: "Image upload is not configured on the server (R2 credentials missing)." },
            { status: 400 }
        );
    }

    const data = await request.formData();
    const file = data.get("file");
    const folder = String(data.get("folder") || "");

    if (!file || typeof file === "string") {
        return json({ error: "No file provided." }, { status: 400 });
    }
    const contentType = resolveImageType(file);
    if (!contentType) {
        return json(
            { error: `Unsupported image type (${file.type || "unknown"}, "${file.name || ""}").` },
            { status: 400 }
        );
    }
    if (file.size > MAX_BYTES) {
        return json({ error: "File too large (max 8 MB)." }, { status: 400 });
    }

    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const path = await uploadImage({
            buffer,
            filename: file.name || "image.png",
            folder,
            contentType,
        });
        return json({ path });
    } catch (e) {
        return json({ error: e.message || "Upload failed." }, { status: 500 });
    }
};
