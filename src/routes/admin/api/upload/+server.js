import { json } from "@sveltejs/kit";
import { uploadImage } from "$lib/server/r2.js";
import { canUploadToR2 } from "$lib/server/config.js";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif", "image/svg+xml"];

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
    if (!ALLOWED.includes(file.type)) {
        return json({ error: `Unsupported type: ${file.type}` }, { status: 400 });
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
            contentType: file.type,
        });
        return json({ path });
    } catch (e) {
        return json({ error: e.message || "Upload failed." }, { status: 500 });
    }
};
