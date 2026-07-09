<script>
    import { enhance } from "$app/forms";
    import ImageUpload from "./ImageUpload.svelte";

    export let project = null; // existing project for edit, or null for new
    export let form = null;    // action result (errors)
    export let mode = "new";   // "new" | "edit"

    // --- Local editable state (deep-copied from project) ---
    const p = project || {};
    let title = p.title || "";
    let slug = p.slug || "";
    let tagline = p.tagline || "";
    let thumb = p.thumb || "";
    let detail = p.detail ?? false;
    let url = p.url || "";
    let codeUrl = p.code_url || p.codeUrl || "";

    let heroLead = p.hero?.lead || "";
    let gallery = (p.hero?.gallery || []).map((g) => ({ ...g }));

    // Blocks: textareas use string form; convert paragraphs/lines on submit.
    let blocks = (p.blocks || []).map((b) => ({
        heading: b.heading || "",
        layout: b.layout || "left",
        body: (b.body || []).join("\n\n"),
        bodyAfter: (b.bodyAfter || []).join("\n\n"),
        listOrdered: b.list?.ordered || false,
        listItems: (b.list?.items || []).join("\n"),
        mediaRow: b.mediaRow || false,
        media: (b.media || []).map((m) => ({ ...m })),
    }));

    let slugTouched = mode === "edit";
    function onTitleInput() {
        if (!slugTouched) {
            slug = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        }
    }

    // --- Gallery helpers ---
    const addGalleryImg = () => (gallery = [...gallery, { src: "", alt: "" }]);
    const removeGalleryImg = (i) => (gallery = gallery.filter((_, idx) => idx !== i));

    // --- Block helpers ---
    const newBlock = () => ({
        heading: "", layout: "left", body: "", bodyAfter: "",
        listOrdered: false, listItems: "", mediaRow: false, media: [],
    });
    const addBlock = () => (blocks = [...blocks, newBlock()]);
    const removeBlock = (i) => (blocks = blocks.filter((_, idx) => idx !== i));
    function moveBlock(i, dir) {
        const j = i + dir;
        if (j < 0 || j >= blocks.length) return;
        const copy = blocks.slice();
        [copy[i], copy[j]] = [copy[j], copy[i]];
        blocks = copy;
    }
    const addBlockMedia = (bi) => {
        blocks[bi].media = [...blocks[bi].media, { src: "", alt: "" }];
        blocks = blocks;
    };
    const removeBlockMedia = (bi, mi) => {
        blocks[bi].media = blocks[bi].media.filter((_, idx) => idx !== mi);
        blocks = blocks;
    };

    // --- Assemble the payload for submission ---
    let payload = "{}";
    $: payload = JSON.stringify({
        slug, title, tagline, thumb, detail, url, code_url: codeUrl,
        hero: detail ? { lead: heroLead, gallery } : undefined,
        blocks: detail
            ? blocks.map((b) => ({
                  heading: b.heading,
                  layout: b.layout,
                  body: b.body,
                  bodyAfter: b.bodyAfter,
                  list: { ordered: b.listOrdered, items: b.listItems },
                  mediaRow: b.mediaRow,
                  media: b.media,
              }))
            : undefined,
    });

    // Slugify a heading into an image subfolder for uploads.
    $: folder = slug || "misc";
</script>

<form method="POST" class="form" use:enhance>
    {#if form?.error}
        <p class="flash flash--err">{form.error}</p>
    {/if}

    <input type="hidden" name="payload" value={payload} />

    <div class="row-2">
        <div class="field">
            <label for="title">Title</label>
            <input class="input" id="title" bind:value={title} on:input={onTitleInput} required />
        </div>
        <div class="field">
            <label for="slug">Slug</label>
            <input
                class="input" id="slug" bind:value={slug}
                on:input={() => (slugTouched = true)}
                readonly={mode === "edit"}
            />
            <span class="hint">
                {mode === "edit" ? "Slug is fixed after creation." : "URL id, auto-filled from title."}
            </span>
        </div>
    </div>

    <div class="field">
        <label for="tagline">Tagline</label>
        <input class="input" id="tagline" bind:value={tagline} placeholder="Python · C++ · OpenCV" />
    </div>

    <ImageUpload bind:value={thumb} folder="" label="Thumbnail" />

    <label class="checkbox">
        <input type="checkbox" bind:checked={detail} />
        Has a detail page (uncheck for an external-link-only card)
    </label>

    {#if !detail}
        <div class="field">
            <label for="url">External URL</label>
            <input class="input" id="url" bind:value={url} placeholder="https://github.com/…" />
            <span class="hint">Where the card links when there's no detail page.</span>
        </div>
    {/if}

    {#if detail}
        <fieldset class="fieldset">
            <legend>Hero</legend>
            <div class="field">
                <label for="lead">Intro paragraph</label>
                <textarea class="textarea" id="lead" bind:value={heroLead} rows="5"></textarea>
            </div>

            <div class="field">
                <label>Gallery images</label>
                {#each gallery as g, i}
                    <div class="block-card">
                        <ImageUpload bind:value={g.src} folder={folder} label={`Image ${i + 1}`} />
                        <div class="field">
                            <label>Alt text</label>
                            <input class="input" bind:value={g.alt} />
                        </div>
                        <button type="button" class="btn btn-sm btn-danger" on:click={() => removeGalleryImg(i)}>
                            Remove image
                        </button>
                    </div>
                {/each}
                <button type="button" class="btn btn-sm" on:click={addGalleryImg}>+ Add gallery image</button>
            </div>
        </fieldset>

        <fieldset class="fieldset">
            <legend>Content blocks</legend>
            {#each blocks as b, bi (bi)}
                <div class="block-card">
                    <div class="block-card__head">
                        <strong>Block {bi + 1}</strong>
                        <div class="pitem__actions">
                            <button type="button" class="btn btn-sm" on:click={() => moveBlock(bi, -1)} disabled={bi === 0}>↑</button>
                            <button type="button" class="btn btn-sm" on:click={() => moveBlock(bi, 1)} disabled={bi === blocks.length - 1}>↓</button>
                            <button type="button" class="btn btn-sm btn-danger" on:click={() => removeBlock(bi)}>Remove</button>
                        </div>
                    </div>

                    <div class="row-2">
                        <div class="field">
                            <label>Heading</label>
                            <input class="input" bind:value={b.heading} />
                        </div>
                        <div class="field">
                            <label>Layout</label>
                            <select class="select" bind:value={b.layout}>
                                <option value="left">Image right (text left)</option>
                                <option value="right">Image left (text right)</option>
                                <option value="full">Full width (no image column)</option>
                            </select>
                        </div>
                    </div>

                    <div class="field">
                        <label>Body (blank line between paragraphs)</label>
                        <textarea class="textarea" bind:value={b.body} rows="4"></textarea>
                    </div>

                    <div class="field">
                        <label class="checkbox"><input type="checkbox" bind:checked={b.listOrdered} /> Numbered list</label>
                        <label>List items (one per line)</label>
                        <textarea class="textarea" bind:value={b.listItems} rows="3"></textarea>
                    </div>

                    <div class="field">
                        <label>Body after list (optional)</label>
                        <textarea class="textarea" bind:value={b.bodyAfter} rows="3"></textarea>
                    </div>

                    <div class="field">
                        <label class="checkbox"><input type="checkbox" bind:checked={b.mediaRow} /> Lay images in a row</label>
                        <label>Block images</label>
                        {#each b.media as m, mi}
                            <div class="block-card">
                                <ImageUpload bind:value={m.src} folder={folder} label={`Image ${mi + 1}`} />
                                <div class="field">
                                    <label>Alt text</label>
                                    <input class="input" bind:value={m.alt} />
                                </div>
                                <button type="button" class="btn btn-sm btn-danger" on:click={() => removeBlockMedia(bi, mi)}>Remove image</button>
                            </div>
                        {/each}
                        <button type="button" class="btn btn-sm" on:click={() => addBlockMedia(bi)}>+ Add block image</button>
                    </div>
                </div>
            {/each}
            <button type="button" class="btn btn-sm" on:click={addBlock}>+ Add content block</button>
        </fieldset>

        <div class="field">
            <label for="codeUrl">“Get code” URL (optional)</label>
            <input class="input" id="codeUrl" bind:value={codeUrl} placeholder="https://github.com/…" />
        </div>
    {/if}

    <div class="actions-bar">
        <button class="btn btn--solid" type="submit">
            {mode === "edit" ? "Save changes" : "Create project"}
        </button>
        <a class="btn" href="/admin">Cancel</a>
    </div>
</form>
