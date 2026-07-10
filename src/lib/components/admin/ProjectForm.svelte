<script>
    import { enhance } from "$app/forms";
    import { autogrow } from "$lib/actions/autogrow.js";
    import InlineImage from "./InlineImage.svelte";
    import "$lib/styles/editor-canvas.css";

    export let project = null; // existing project for edit, or null for new
    export let form = null;    // action result (errors)
    export let mode = "new";   // "new" | "edit"

    const p = project || {};
    let title = p.title || "";
    let slug = p.slug || "";
    let tagline = p.tagline || "";
    let thumb = p.thumb || "";
    let detail = p.detail ?? (mode === "new");
    let url = p.url || "";
    let codeUrl = p.code_url || p.codeUrl || "";

    let heroLead = p.hero?.lead || "";
    let gallery = (p.hero?.gallery || []).map((g) => ({ ...g }));

    // Blocks — body/list/bodyAfter kept as string form (paragraphs = blank-line
    // separated, list items = newline separated), matching parseProjectPayload.
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
        if (!slugTouched)
            slug = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    }

    function move(arr, i, dir) {
        const j = i + dir;
        if (j < 0 || j >= arr.length) return arr;
        const c = arr.slice();
        [c[i], c[j]] = [c[j], c[i]];
        return c;
    }

    // Gallery
    const addGalleryImg = () => (gallery = [...gallery, { src: "", alt: "" }]);
    const removeGalleryImg = (i) => (gallery = gallery.filter((_, x) => x !== i));

    // Blocks
    const newBlock = () => ({
        heading: "New section", layout: "left", body: "", bodyAfter: "",
        listOrdered: false, listItems: "", mediaRow: false, media: [],
    });
    const addBlock = () => (blocks = [...blocks, newBlock()]);
    const removeBlock = (i) => (blocks = blocks.filter((_, x) => x !== i));
    const moveBlock = (i, d) => (blocks = move(blocks, i, d));
    const cycleLayout = (bi) => {
        const order = ["left", "right", "full"];
        const n = order[(order.indexOf(blocks[bi].layout) + 1) % order.length];
        blocks[bi].layout = n;
        blocks = blocks;
    };
    const layoutLabel = (l) =>
        l === "right" ? "Image left" : l === "full" ? "Full width" : "Image right";
    const addBlockMedia = (bi) => {
        blocks[bi].media = [...blocks[bi].media, { src: "", alt: "" }];
        blocks = blocks;
    };
    const removeBlockMedia = (bi, mi) => {
        blocks[bi].media = blocks[bi].media.filter((_, x) => x !== mi);
        blocks = blocks;
    };

    // Split preview helpers (mirror the server's split rules) so list bullets
    // and paragraphs render live as you type.
    const paras = (s) => String(s || "").split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
    const lines = (s) => String(s || "").split(/\n/).map((x) => x.trim()).filter(Boolean);

    $: folder = slug || "misc";

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
</script>

<form method="POST" use:enhance>
    {#if form?.error}<p class="flash flash--err">{form.error}</p>{/if}
    <input type="hidden" name="payload" value={payload} />

    <!-- ---- Non-visual settings (not shown on the rendered page) ---- -->
    <div class="settings">
        <div class="settings__grid">
            <label class="mini">Slug
                <input class="input" bind:value={slug} on:input={() => (slugTouched = true)} readonly={mode === "edit"} />
            </label>
            <label class="mini checkbox-mini">
                <input type="checkbox" bind:checked={detail} />
                Has a detail page
            </label>
            {#if !detail}
                <label class="mini">External URL
                    <input class="input" bind:value={url} placeholder="https://…" />
                </label>
            {:else}
                <label class="mini">“Get code” URL
                    <input class="input" bind:value={codeUrl} placeholder="https://github.com/…" />
                </label>
            {/if}
        </div>
        <div class="settings__thumb">
            <span class="mini">Card thumbnail</span>
            <InlineImage bind:src={thumb} alt="" folder="" />
        </div>
    </div>

    <p class="editor-hint">
        {#if detail}
            This is the project's live detail page. Click any text or image to edit
            it in place; hover a section for its controls.
        {:else}
            This project is an external link only (no detail page). It shows as a
            card that links to the URL above. Enable “Has a detail page” to build a
            full page.
        {/if}
    </p>

    {#if detail}
    <div class="canvas">
        <div class="canvas__bar">
            <span class="canvas__dot"></span><span class="canvas__dot"></span><span class="canvas__dot"></span>
            <span class="canvas__url">jonathan-freier.com/projects/{slug || "…"}</span>
        </div>

        <main class="project-detail">
            <article class="project-detail__inner">
                <span class="project-detail__back">← All projects</span>

                <header class="project-hero">
                    <h1 class="project-hero__title">
                        <input class="ce" bind:value={title} on:input={onTitleInput} placeholder="Project title" />
                    </h1>
                    <p class="project-hero__tagline">
                        <input class="ce" bind:value={tagline} placeholder="Short tagline · tech · stack" />
                    </p>
                    <p class="project-hero__lead">
                        <textarea class="ce" rows="2" use:autogrow bind:value={heroLead} placeholder="Intro paragraph that leads the page…"></textarea>
                    </p>

                    <div class="project-hero__gallery">
                        {#each gallery as g, i (i)}
                            <div class="hero-img">
                                <InlineImage bind:src={g.src} bind:alt={g.alt} {folder} onRemove={() => removeGalleryImg(i)} />
                            </div>
                        {/each}
                        <button type="button" class="imgslot__empty gallery-add" on:click={addGalleryImg}>＋ Add hero image</button>
                    </div>
                </header>

                <!-- ===== Content blocks ===== -->
                {#each blocks as b, bi (bi)}
                    <section class="block block--{b.layout} editable">
                        <div class="tools tools--float">
                            <button class="iconbtn" type="button" title="Change layout" on:click={() => cycleLayout(bi)}>⇆ {layoutLabel(b.layout)}</button>
                            <button class="iconbtn" type="button" title="Move up" on:click={() => moveBlock(bi, -1)} disabled={bi === 0}>↑</button>
                            <button class="iconbtn" type="button" title="Move down" on:click={() => moveBlock(bi, 1)} disabled={bi === blocks.length - 1}>↓</button>
                            <button class="iconbtn iconbtn--danger" type="button" title="Remove section" on:click={() => removeBlock(bi)}>✕</button>
                        </div>

                        <div class="block__content">
                            <h2 class="block__heading">
                                <input class="ce" bind:value={b.heading} placeholder="Section heading" />
                            </h2>
                            <div class="block__body">
                                <textarea class="ce block__field" rows="3" use:autogrow bind:value={b.body} placeholder="Body text. Leave a blank line between paragraphs."></textarea>

                                <div class="block__listedit">
                                    <label class="listtoggle">
                                        <input type="checkbox" bind:checked={b.listOrdered} /> numbered list
                                    </label>
                                    <textarea class="ce block__field" rows="2" use:autogrow bind:value={b.listItems} placeholder="Optional list — one item per line"></textarea>
                                    {#if lines(b.listItems).length}
                                        <svelte:element this={b.listOrdered ? "ol" : "ul"} class="block__list block__list--preview">
                                            {#each lines(b.listItems) as it}<li>{it}</li>{/each}
                                        </svelte:element>
                                    {/if}
                                </div>

                                <textarea class="ce block__field" rows="2" use:autogrow bind:value={b.bodyAfter} placeholder="Optional text after the list"></textarea>
                            </div>
                        </div>

                        {#if b.layout !== "full"}
                            <div class="block__media" class:block__media--row={b.mediaRow}>
                                {#each b.media as m, mi (mi)}
                                    <InlineImage bind:src={m.src} bind:alt={m.alt} {folder} onRemove={() => removeBlockMedia(bi, mi)} />
                                {/each}
                                <button type="button" class="imgslot__empty" on:click={() => addBlockMedia(bi)}>＋ Add image</button>
                                {#if b.media.length > 1}
                                    <label class="listtoggle rowtoggle">
                                        <input type="checkbox" bind:checked={b.mediaRow} /> lay images in a row
                                    </label>
                                {/if}
                            </div>
                        {/if}
                    </section>
                {/each}

                <div class="block-add">
                    <button type="button" class="add-inline" on:click={addBlock}>＋ Add content section</button>
                </div>

                {#if codeUrl}
                    <div class="project-detail__code">
                        <span class="btn btn--solid">Get code on GitHub</span>
                    </div>
                {/if}
            </article>
        </main>
    </div>
    {/if}

    <div class="save-bar">
        <button class="btn btn--solid" type="submit">
            {mode === "edit" ? "Save changes" : "Create project"}
        </button>
        <a class="btn btn-sm" href="/admin">Cancel</a>
        {#if mode === "edit" && detail}
            <a class="btn btn-sm" href={`/projects/${slug}/`} target="_blank" rel="noopener">Open live page ↗</a>
        {/if}
    </div>
</form>

<style>
    .editor-hint { color: var(--text-muted); margin: 0.75rem 0 1rem; font-size: 0.9rem; }

    /* `.ce` inputs inherit `color` from their surrounding real class; some of
       those (e.g. the tagline uses --bg-deep) are dark-on-dark against the
       editor canvas and become invisible while typing. Force every editable
       field to a light, high-contrast color; the non-editable rendered text
       keeps the real page's colors. */
    :global(.ce) { color: var(--text); }
    :global(.ce::placeholder) { color: rgba(255, 255, 255, 0.45); }

    /* Settings strip above the canvas */
    .settings {
        display: flex;
        gap: 1.25rem;
        flex-wrap: wrap;
        align-items: flex-start;
        justify-content: space-between;
        padding: 1rem;
        border: 2px solid var(--accent);
        border-radius: var(--radius);
        background: rgba(9, 82, 86, 0.25);
    }
    .settings__grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 0.75rem 1rem;
        flex: 1;
        min-width: 260px;
    }
    .settings__thumb { width: 180px; }
    .mini {
        display: block;
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--text-muted);
    }
    .mini .input { margin-top: 0.25rem; }
    .checkbox-mini {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        align-self: end;
        color: var(--text);
    }

    /* ---- Real project-detail look (mirrors routes/projects/[slug]) ---- */
    .project-detail {
        background: linear-gradient(180deg, var(--bg-page-start) 0%, var(--bg-page-end) 100%);
    }
    .project-detail__inner {
        max-width: var(--content-max);
        margin: 0 auto;
        padding: clamp(2rem, 6vh, 4rem) clamp(1.25rem, 4vw, 2.5rem) clamp(3rem, 8vh, 5rem);
    }
    .project-detail__back {
        display: inline-flex;
        margin-bottom: 1.5rem;
        color: var(--bg-deep);
        font-weight: 700;
    }
    .project-hero__title { font-size: clamp(2rem, 6vw, 3.5rem); color: var(--text); }
    .project-hero__tagline { margin: 0.75rem 0 1.5rem; color: var(--bg-deep); font-weight: 700; font-size: clamp(1rem, 2.5vw, 1.25rem); }
    .project-hero__lead { color: var(--text); font-size: 1.05rem; max-width: 70ch; }
    .project-hero__gallery {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin: 1.5rem 0;
    }
    .hero-img :global(.imgslot__img) {
        width: 100%;
        aspect-ratio: 4 / 3;
        object-fit: cover;
        border: 2px solid var(--accent);
        border-radius: var(--radius);
    }
    .gallery-add { min-height: 0; aspect-ratio: 4 / 3; }

    .block {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: clamp(1.25rem, 4vw, 2.5rem);
        align-items: center;
        margin: clamp(2rem, 6vh, 4rem) 0;
    }
    .block--right .block__media { order: 2; }
    .block--full { grid-template-columns: 1fr; }
    .block__heading {
        font-size: clamp(1.4rem, 3.5vw, 2rem);
        color: var(--text);
        padding-bottom: 0.4rem;
        margin-bottom: 1rem;
        border-bottom: 3px solid var(--accent);
    }
    .block__body { color: var(--text); font-size: 1.02rem; }
    .block__field { margin-bottom: 0.75rem; }
    .block__list--preview {
        margin: 0 0 1rem;
        padding-left: 1.4rem;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        color: var(--text);
    }
    .block__listedit {
        border-left: 2px dashed rgba(255, 255, 255, 0.2);
        padding-left: 0.6rem;
        margin: 0 0 0.75rem;
    }
    .block__media { display: grid; gap: 1rem; }
    .block__media :global(.imgslot__img) {
        width: 100%;
        object-fit: cover;
        border: 2px solid var(--accent);
        border-radius: var(--radius);
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
    }
    .block__media--row { grid-auto-flow: column; grid-auto-columns: 1fr; }

    .listtoggle {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.75rem;
        color: var(--text-muted);
        font-weight: 700;
        margin-bottom: 0.4rem;
    }
    .rowtoggle { margin-top: 0.3rem; }
    .block-add { margin: 2rem 0; text-align: center; }
    .project-detail__code { display: flex; justify-content: center; margin-top: clamp(2rem, 6vh, 3rem); }

    @media (max-width: 768px) {
        .block { grid-template-columns: 1fr; }
        .block--right .block__media { order: 0; }
        .block__media--row { grid-auto-flow: row; }
    }
</style>
