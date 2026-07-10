<script>
    import { enhance } from "$app/forms";
    import { page } from "$app/stores";

    export let data;
    export let form;

    // Public-site origin so the "Open printable page" link points at the public
    // host (a relative link on the admin host is redirected back to /admin).
    $: siteBase = $page.data.siteUrl || "";

    // ---- Header (identity + contact): the only thing this tab edits. ----
    let heading = {
        name: data.resume.heading?.name || "",
        title: data.resume.heading?.title || "",
        email: data.resume.heading?.email || "",
        phone: data.resume.heading?.phone || "",
        location: data.resume.heading?.location || "",
        links: (data.resume.heading?.links || []).map((l) => ({
            label: l.label || "",
            href: l.href || "",
        })),
    };
    const addLink = () => (heading.links = [...heading.links, { label: "", href: "" }]);
    const removeLink = (i) => (heading.links = heading.links.filter((_, x) => x !== i));

    $: payload = JSON.stringify({ heading });

    // ---- Preview: same chronological merge + shape the /resume/print page uses.
    // The header reflects live edits above; content is the saved resume (edited
    // on the Web tab), so the preview is an accurate picture of the exported PDF.
    const PRESENT = 9999;
    $: entries = buildEntries(data.resume);
    function buildEntries(r) {
        const out = [];
        for (const job of r?.experience ?? []) {
            for (const role of job.roles ?? []) {
                out.push({
                    kind: "experience", org: job.company, role: role.title,
                    dates: role.dates, start: role.start ?? null, end: role.end ?? null,
                    points: role.points ?? [],
                });
            }
        }
        for (const edu of r?.education ?? []) {
            out.push({
                kind: "education", org: edu.school, role: edu.credential,
                dates: edu.dates, start: edu.start ?? null, end: edu.end ?? null,
                points: edu.points ?? [],
            });
        }
        out.sort((a, b) => {
            const ae = a.end == null ? PRESENT : a.end;
            const be = b.end == null ? PRESENT : b.end;
            if (be !== ae) return be - ae;
            return (b.start ?? 0) - (a.start ?? 0);
        });
        return out;
    }
    $: experience = entries.filter((e) => e.kind === "experience");
    $: education = entries.filter((e) => e.kind === "education");
    $: contactParts = [heading.email, heading.phone, heading.location].filter((x) => x && String(x).trim());

    let saving = false;
    const submit = () => {
        saving = true;
        return async ({ update }) => { await update({ reset: false }); saving = false; };
    };
</script>

<svelte:head><title>Resume Export — Admin</title></svelte:head>

<div class="admin-wrap admin-wrap--wide export-page">
    {#if !data.hasDatabase}
        <p class="flash flash--err">
            No database is configured (DATABASE_URL unset). You can edit the header
            here, but changes can't be saved until a database is attached.
        </p>
    {/if}
    {#if form?.saved}<p class="flash flash--ok">Header saved.</p>{/if}
    {#if form?.error}<p class="flash flash--err">{form.error}</p>{/if}

    <p class="editor-hint">
        These fields head the printable PDF (not the live timeline page). The
        preview on the right shows the exported resume with your saved skills and
        experience. Edit those on the <a href="/admin/resume">Web</a> tab.
    </p>

    <div class="export-grid">
        <!-- ===================== LEFT: HEADER EDITOR ===================== -->
        <form class="hdr-form" method="POST" use:enhance={submit}>
            <input type="hidden" name="payload" value={payload} />

            <div class="hdr-card">
                <p class="hdr-card__label">Resume header</p>
                <div class="fldgrid">
                    <label class="fld fld--wide"><span>Name</span>
                        <input class="fldinput" bind:value={heading.name} placeholder="Jonathan Freier" /></label>
                    <label class="fld fld--wide"><span>Title</span>
                        <input class="fldinput" bind:value={heading.title} placeholder="Controls Engineer & Developer" /></label>
                    <label class="fld"><span>Email</span>
                        <input class="fldinput" bind:value={heading.email} placeholder="you@example.com" /></label>
                    <label class="fld"><span>Phone</span>
                        <input class="fldinput" bind:value={heading.phone} placeholder="(optional)" /></label>
                    <label class="fld"><span>Location</span>
                        <input class="fldinput" bind:value={heading.location} placeholder="City, ST (optional)" /></label>
                </div>

                <div class="links">
                    <span class="links__label">Links</span>
                    {#each heading.links as l, li (li)}
                        <div class="linkrow">
                            <input class="fldinput" bind:value={l.label} placeholder="LinkedIn" />
                            <input class="fldinput linkrow__href" bind:value={l.href} placeholder="https://…" />
                            <button class="iconbtn iconbtn--danger" type="button" title="Remove link" on:click={() => removeLink(li)}>✕</button>
                        </div>
                    {/each}
                    <button class="add-inline" type="button" on:click={addLink}>＋ link</button>
                </div>
            </div>

            <div class="save-bar">
                <button class="btn btn--solid" type="submit" disabled={saving || !data.hasDatabase}>
                    {saving ? "Saving…" : "Save header"}
                </button>
                <a class="btn btn-sm" href="{siteBase}/resume/print" target="_blank" rel="noopener">Open printable page ↗</a>
            </div>
            <p class="editor-hint editor-hint--sm">
                “Open printable page” opens the full-size resume; use your browser’s
                Print → “Save as PDF”. Save the header first so the PDF reflects it.
            </p>
        </form>

        <!-- ===================== RIGHT: PDF PREVIEW ===================== -->
        <div class="preview">
            <p class="preview__label">PDF preview</p>
            <div class="preview__scroll">
                <div class="sheet">
                    <header class="rhead">
                        {#if heading.name}<h1 class="rhead__name">{heading.name}</h1>{/if}
                        {#if heading.title}<p class="rhead__title">{heading.title}</p>{/if}
                        {#if contactParts.length || heading.links.length}
                            <p class="rhead__contact">
                                {#each contactParts as part, i}
                                    {#if i > 0}<span class="dot">•</span>{/if}<span>{part}</span>
                                {/each}
                                {#each heading.links as link}
                                    {#if link.label || link.href}
                                        <span class="dot">•</span><span>{link.label || link.href}</span>
                                    {/if}
                                {/each}
                            </p>
                        {/if}
                    </header>

                    {#if data.resume.skills?.length}
                        <section class="rsec">
                            <h2 class="rsec__title">Skills</h2>
                            <div class="skills">
                                {#each data.resume.skills as group}
                                    <div class="skills__row">
                                        <span class="skills__heading">{group.heading}</span>
                                        <span class="skills__items">
                                            {#each group.items as item, i}
                                                {#if i > 0}<span>, </span>{/if}
                                                {#if typeof item === "string"}{item}{:else}{item.text}{#if item.tag}<span class="skills__tag"> ({item.tag})</span>{/if}{/if}
                                            {/each}
                                        </span>
                                    </div>
                                {/each}
                            </div>
                        </section>
                    {/if}

                    {#if experience.length}
                        <section class="rsec">
                            <h2 class="rsec__title">Experience</h2>
                            {#each experience as e}
                                <article class="item">
                                    <div class="item__head">
                                        <span class="item__org">{e.org}{#if e.role}<span class="item__role"> — {e.role}</span>{/if}</span>
                                        {#if e.dates}<span class="item__dates">{e.dates}</span>{/if}
                                    </div>
                                    {#if e.points?.length}
                                        <ul class="item__points">{#each e.points as pt}<li>{pt}</li>{/each}</ul>
                                    {/if}
                                </article>
                            {/each}
                        </section>
                    {/if}

                    {#if education.length}
                        <section class="rsec">
                            <h2 class="rsec__title">Education</h2>
                            {#each education as e}
                                <article class="item">
                                    <div class="item__head">
                                        <span class="item__org">{e.org}{#if e.role}<span class="item__role"> — {e.role}</span>{/if}</span>
                                        {#if e.dates}<span class="item__dates">{e.dates}</span>{/if}
                                    </div>
                                    {#if e.points?.length}
                                        <ul class="item__points">{#each e.points as pt}<li>{pt}</li>{/each}</ul>
                                    {/if}
                                </article>
                            {/each}
                        </section>
                    {/if}
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    /* Full-bleed: use the whole display width instead of the 1160px
       .admin-wrap--wide cap, so the header editor + PDF preview get maximum room. */
    .export-page {
        max-width: none;
        padding-bottom: 3rem;
        padding-left: clamp(0.75rem, 2vw, 1.5rem);
        padding-right: clamp(0.75rem, 2vw, 1.5rem);
    }
    .editor-hint { color: var(--text-muted); margin: 0.5rem 0 1.25rem; font-size: 0.9rem; }
    .editor-hint a { color: var(--accent); }
    .editor-hint--sm { margin: 0.6rem 0 0; font-size: 0.82rem; }

    /* Header editor gets just enough width for its short fields; the preview
       column takes ALL remaining space so the PDF is as large as possible. */
    .export-grid {
        display: grid;
        grid-template-columns: minmax(300px, 380px) 1fr;
        gap: clamp(1.25rem, 3vw, 2.5rem);
        align-items: start;
    }

    /* ---------- Header editor ---------- */
    .hdr-card {
        padding: 1.25rem;
        background: rgba(0, 0, 0, 0.22);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: var(--radius);
    }
    .hdr-card__label {
        margin: 0 0 1rem;
        font-family: var(--font-mono);
        font-size: 0.72rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        font-weight: 700;
        color: var(--accent);
    }
    .fldgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem 1rem; }
    .fld { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; }
    .fld--wide { grid-column: span 2; }
    .fld > span { font-size: 0.7rem; font-weight: 700; color: var(--text-muted); letter-spacing: 0.04em; }
    .fldinput {
        color: var(--text);
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: var(--radius);
        padding: 0.45rem 0.6rem;
        font-size: 0.95rem;
        width: 100%;
        box-sizing: border-box;
    }
    .fldinput::placeholder { color: rgba(255, 255, 255, 0.4); }
    .links { margin-top: 1rem; }
    .links__label { display: block; margin-bottom: 0.4rem; font-size: 0.7rem; font-weight: 700; color: var(--text-muted); letter-spacing: 0.04em; }
    .linkrow { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; }
    .linkrow .fldinput { flex: 0 0 11ch; }
    .linkrow__href { flex: 1 1 auto !important; min-width: 0; }

    .save-bar { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; margin-top: 1.25rem; }

    /* ---------- Preview (a light "sheet" like the print page, scaled to fit) ---------- */
    .preview { min-width: 0; }
    .preview__label {
        margin: 0 0 0.6rem;
        font-family: var(--font-mono);
        font-size: 0.72rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        font-weight: 700;
        color: var(--text-muted);
    }
    .preview__scroll {
        background: #e5e7eb;
        border-radius: var(--radius);
        padding: clamp(1rem, 2vw, 2rem);
        max-height: calc(100vh - 10rem);
        overflow: auto;
    }
    /* Mirrors routes/resume/print sheet styling so the preview matches the PDF.
       The sheet fills the (now wide) preview column rather than being pinned at
       8.5in, so it's as large as the space allows; it still centers and caps at a
       comfortable reading width so it never becomes absurdly wide on huge
       monitors. Padding scales in real inches so proportions stay page-accurate. */
    .sheet {
        box-sizing: border-box;
        width: 100%;
        max-width: 1100px;
        margin: 0 auto;
        padding: 0.55in 0.6in;
        background: #fff;
        color: #1a1a1a;
        font-family: "Helvetica Neue", Arial, system-ui, sans-serif;
        font-size: 10.5pt;
        line-height: 1.35;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
    }
    .rhead { text-align: center; margin-bottom: 0.55rem; padding-bottom: 0.55rem; border-bottom: 2px solid #1a1a1a; }
    .rhead__name { margin: 0; font-size: 21pt; font-weight: 800; letter-spacing: 0.01em; }
    .rhead__title { margin: 0.1rem 0 0; font-size: 11.5pt; color: #444; font-weight: 600; }
    .rhead__contact { margin: 0.35rem 0 0; font-size: 9.5pt; color: #333; }
    .rhead__contact .dot { margin: 0 0.4rem; color: #999; }
    .rsec { margin-top: 0.7rem; }
    .rsec__title {
        margin: 0 0 0.35rem;
        font-size: 11pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em;
        color: #1a1a1a; border-bottom: 1px solid #bbb; padding-bottom: 0.1rem;
    }
    .skills { display: flex; flex-direction: column; gap: 0.15rem; }
    .skills__row { display: flex; gap: 0.4rem; }
    .skills__heading { flex: 0 0 auto; font-weight: 700; min-width: 11ch; }
    .skills__heading::after { content: ":"; }
    .skills__items { flex: 1; }
    .skills__tag { color: #555; }
    .item { margin-top: 0.4rem; break-inside: avoid; }
    .item__head { display: flex; justify-content: space-between; align-items: baseline; gap: 0.75rem; }
    .item__org { font-weight: 700; font-size: 10.5pt; }
    .item__role { font-weight: 600; color: #333; }
    .item__dates { flex: 0 0 auto; font-size: 9pt; color: #555; white-space: nowrap; }
    .item__points { margin: 0.15rem 0 0; padding-left: 1.1rem; }
    .item__points li { margin: 0.08rem 0; }

    @media (max-width: 900px) {
        .export-grid { grid-template-columns: 1fr; }
    }
</style>
