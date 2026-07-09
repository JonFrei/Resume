<script>
    /* InlineImage — a click-to-edit image slot for the "edit in place" editors.
     * Shows the image at its real rendered size; clicking it (or the empty
     * placeholder) reveals an upload + alt-text panel. */
    import { page } from "$app/stores";
    import { assetUrl } from "$lib/assets.js";

    export let src = "";
    export let alt = "";
    export let folder = "";
    export let onRemove = null; // optional () => void

    let open = false;
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
            src = data.path;
        } catch (err) {
            error = err.message;
        } finally {
            uploading = false;
            e.target.value = "";
        }
    }
</script>

<div class="imgslot editable">
    {#if src}
        <button type="button" class="imgslot__imgbtn" title="Edit image" on:click={() => (open = !open)}>
            <img class="imgslot__img" src={assetUrl(src, base)} alt={alt || ""} />
        </button>
        <div class="tools tools--float">
            <button class="iconbtn" type="button" title="Edit image" on:click={() => (open = !open)}>✎</button>
            {#if onRemove}
                <button class="iconbtn iconbtn--danger" type="button" title="Remove image" on:click={onRemove}>✕</button>
            {/if}
        </div>
    {:else}
        <button type="button" class="imgslot__empty" on:click={() => (open = true)}>
            ＋ Add image
        </button>
    {/if}

    {#if open}
        <div class="imgslot__panel">
            <div class="uploader">
                <input type="file" accept="image/*" on:change={onFile} disabled={uploading} />
                {#if uploading}<span class="hint">Uploading…</span>{/if}
                {#if error}<span class="hint" style="color:#ffb0b0">{error}</span>{/if}
            </div>
            <label class="mini">Path
                <input class="input" type="text" bind:value={src} placeholder="/assets/img/…" />
            </label>
            <label class="mini">Alt text
                <input class="input" type="text" bind:value={alt} placeholder="describe the image" />
            </label>
            <div class="panel-actions">
                <button type="button" class="btn btn-sm" on:click={() => (open = false)}>Done</button>
                {#if onRemove}
                    <button type="button" class="btn btn-sm btn-danger" on:click={onRemove}>Remove</button>
                {/if}
            </div>
        </div>
    {/if}
</div>

<style>
    .imgslot__imgbtn {
        display: block;
        width: 100%;
        padding: 0;
        border: none;
        background: none;
        cursor: pointer;
    }
    .imgslot__img { cursor: pointer; }
    .mini {
        display: block;
        font-size: 0.75rem;
        color: var(--text-muted);
        margin-top: 0.5rem;
    }
    .panel-actions {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.6rem;
    }
</style>
