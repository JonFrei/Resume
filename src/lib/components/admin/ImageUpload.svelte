<script>
    import { page } from "$app/stores";
    import { assetUrl } from "$lib/assets.js";

    export let value = "";           // current image path (/assets/img/...)
    export let folder = "";          // optional R2 subfolder
    export let label = "Image";

    let uploading = false;
    let error = "";

    $: base = $page.data.assetBase || "";

    async function onFile(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        uploading = true;
        error = "";
        try {
            const fd = new FormData();
            fd.append("file", file);
            if (folder) fd.append("folder", folder);
            const res = await fetch("/admin/api/upload", { method: "POST", body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Upload failed");
            value = data.path;
        } catch (err) {
            error = err.message;
        } finally {
            uploading = false;
            e.target.value = "";
        }
    }
</script>

<div class="field">
    <label>{label}</label>
    <div class="uploader">
        {#if value}
            <img class="thumb-preview" src={assetUrl(value, base)} alt="" />
        {/if}
        <div>
            <input type="file" accept="image/*" on:change={onFile} disabled={uploading} />
            {#if uploading}<span class="hint">Uploading…</span>{/if}
            {#if error}<span class="hint" style="color:#ffb0b0">{error}</span>{/if}
        </div>
    </div>
    <input class="input" type="text" bind:value placeholder="/assets/img/…" />
    <span class="hint">Upload a file, or paste an existing image path.</span>
</div>
