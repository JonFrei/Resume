<script>
    import { resumeFontStack } from "$lib/resumeFonts.js";

    export let data;
    $: resume = data.resume;
    $: heading = resume.heading || {};

    // Section-wide skills layout ("columns" = groups side by side, one column
    // each with a vertical item list, like the classic printed resume; anything
    // else = compact "Heading: items" rows). Set on the admin Skills tab.
    $: skillsLayout = resume.skillsLayout === "columns" ? "columns" : "rows";

    // Resolve the header's chosen font to a CSS stack, applied to .sheet so the
    // printed PDF uses the font selected on the admin Export tab.
    $: fontStack = resumeFontStack(heading.font);

    // Build one chronologically-sorted list from experience roles + education,
    // mirroring the live /resume page's ordering (newest end first; a null end
    // means "Present" and sorts to the top). The print layout renders this flat,
    // with no timeline spine.
    const PRESENT = 9999;
    $: entries = buildEntries(resume);

    function buildEntries(r) {
        const out = [];
        for (const job of r?.experience ?? []) {
            for (const role of job.roles ?? []) {
                out.push({
                    kind: "experience",
                    org: job.company,
                    role: role.title,
                    dates: role.dates,
                    start: role.start ?? null,
                    end: role.end ?? null,
                    points: role.points ?? [],
                });
            }
        }
        for (const edu of r?.education ?? []) {
            out.push({
                kind: "education",
                org: edu.school,
                role: edu.credential,
                dates: edu.dates,
                start: edu.start ?? null,
                end: edu.end ?? null,
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

    // Contact line: email, phone, location, then any links — only the ones set.
    $: contactParts = [heading.email, heading.phone, heading.location].filter(
        (x) => x && String(x).trim()
    );

    function print() {
        if (typeof window !== "undefined") window.print();
    }
</script>

<svelte:head>
    <title>{heading.name ? `${heading.name} — Resume` : "Resume"}</title>
    <meta name="robots" content="noindex" />
</svelte:head>

<!-- Toolbar: on-screen only, hidden when printing. -->
<div class="toolbar">
    <a class="tbtn tbtn--ghost" href="/admin/resume">← Back to editor</a>
    <button class="tbtn" type="button" on:click={print}>Print / Save as PDF</button>
</div>

<div class="sheet" style="font-family: {fontStack};">
    <!-- ===================== HEADER ===================== -->
    <header class="rhead">
        {#if heading.name}<h1 class="rhead__name">{heading.name}</h1>{/if}
        {#if heading.title}<p class="rhead__title">{heading.title}</p>{/if}
        {#if contactParts.length || (heading.links && heading.links.length)}
            <p class="rhead__contact">
                {#each contactParts as part, i}
                    {#if i > 0}<span class="dot">•</span>{/if}<span>{part}</span>
                {/each}
                {#each heading.links || [] as link}
                    <span class="dot">•</span>
                    {#if link.href}
                        <a href={link.href}>{link.label || link.href}</a>
                    {:else}
                        <span>{link.label}</span>
                    {/if}
                {/each}
            </p>
        {/if}
    </header>

    <!-- ===================== SKILLS ===================== -->
    {#if resume.skills?.length}
        <section class="rsec">
            <h2 class="rsec__title">Skills</h2>
            {#if skillsLayout === "columns"}
                <!-- Columns: each group is a column — a heading over a vertical
                     list of its items. Mirrors the classic printed-resume skills
                     table (Programming Languages | Frameworks | Protocols | …). -->
                <div class="skills skills--columns">
                    {#each resume.skills as group}
                        <div class="skills__col">
                            <span class="skills__colheading">{group.heading}</span>
                            <ul class="skills__collist">
                                {#each group.items as item}
                                    <li>
                                        {#if typeof item === "string"}{item}{:else}{item.text}{#if item.tag}<span class="skills__tag"> ({item.tag})</span>{/if}{/if}
                                    </li>
                                {/each}
                            </ul>
                        </div>
                    {/each}
                </div>
            {:else}
                <div class="skills">
                    {#each resume.skills as group}
                        <div class="skills__row">
                            <span class="skills__heading">{group.heading}</span>
                            <span class="skills__items">
                                {#each group.items as item, i}
                                    {#if i > 0}<span class="sep">, </span>{/if}
                                    {#if typeof item === "string"}{item}{:else}{item.text}{#if item.tag}<span class="skills__tag"> ({item.tag})</span>{/if}{/if}
                                {/each}
                            </span>
                        </div>
                    {/each}
                </div>
            {/if}
        </section>
    {/if}

    <!-- ===================== EXPERIENCE ===================== -->
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
                        <ul class="item__points">
                            {#each e.points as pt}<li>{pt}</li>{/each}
                        </ul>
                    {/if}
                </article>
            {/each}
        </section>
    {/if}

    <!-- ===================== EDUCATION ===================== -->
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
                        <ul class="item__points">
                            {#each e.points as pt}<li>{pt}</li>{/each}
                        </ul>
                    {/if}
                </article>
            {/each}
        </section>
    {/if}
</div>

<style>
    /* The print resume is deliberately its OWN visual world: a light, high-
       contrast, serif-free document optimized for paper — not the dark themed
       site. It does NOT use the site's theme tokens so a dark theme can't leak
       into the PDF. Screen preview mimics a sheet of paper on a gray desk. */

    :global(body) { background: #e5e7eb; }

    .toolbar {
        position: sticky;
        top: 0;
        z-index: 10;
        display: flex;
        gap: 0.75rem;
        justify-content: center;
        padding: 0.75rem;
        background: #1f2937;
    }
    .tbtn {
        font: 600 0.9rem/1 system-ui, sans-serif;
        padding: 0.6rem 1.1rem;
        border-radius: 8px;
        border: 1px solid transparent;
        background: #2563eb;
        color: #fff;
        cursor: pointer;
        text-decoration: none;
    }
    .tbtn:hover { background: #1d4ed8; }
    .tbtn--ghost {
        background: transparent;
        border-color: rgba(255, 255, 255, 0.3);
        color: #e5e7eb;
        display: inline-flex;
        align-items: center;
    }
    .tbtn--ghost:hover { background: rgba(255, 255, 255, 0.08); }

    /* The page sheet. On screen it's a centered white card; in print it fills
       the page and the desk background disappears. */
    .sheet {
        box-sizing: border-box;
        width: 8.5in;
        max-width: 100%;
        min-height: 11in;
        margin: 1.5rem auto;
        padding: 0.55in 0.6in;
        background: #fff;
        color: #1a1a1a;
        font-family: "Helvetica Neue", Arial, system-ui, sans-serif;
        font-size: 10.5pt;
        line-height: 1.35;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
    }

    /* ---------- Header ---------- */
    .rhead { text-align: center; margin-bottom: 0.55rem; padding-bottom: 0.55rem; border-bottom: 2px solid #1a1a1a; }
    /* The global base.css `h1..h4` rule sets font-family: var(--font-head),
       which beats the .sheet inline font by direct-match specificity. Reset the
       resume's heading elements to inherit so the picked font reaches the name
       and section titles too. */
    .rhead__name { margin: 0; font-size: 21pt; font-weight: 800; letter-spacing: 0.01em; font-family: inherit; }
    .rhead__title { margin: 0.1rem 0 0; font-size: 11.5pt; color: #444; font-weight: 600; }
    .rhead__contact { margin: 0.35rem 0 0; font-size: 9.5pt; color: #333; }
    .rhead__contact a { color: #1a1a1a; text-decoration: none; }
    .rhead__contact .dot { margin: 0 0.4rem; color: #999; }

    /* ---------- Sections ---------- */
    .rsec { margin-top: 0.7rem; }
    .rsec__title {
        margin: 0 0 0.35rem;
        font-size: 11pt;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #1a1a1a;
        border-bottom: 1px solid #bbb;
        padding-bottom: 0.1rem;
        font-family: inherit; /* override the global h1..h4 font (see .rhead__name) */
    }

    /* ---------- Skills (compact heading: items rows) ---------- */
    .skills { display: flex; flex-direction: column; gap: 0.15rem; }
    .skills__row { display: flex; gap: 0.4rem; }
    .skills__heading { flex: 0 0 auto; font-weight: 700; min-width: 11ch; }
    .skills__heading::after { content: ":"; }
    .skills__items { flex: 1; }
    .skills__tag { color: #555; }

    /* ---------- Skills (columns: heading over a vertical item list) ----------
       The classic printed-resume table: groups laid out side by side. auto-fit
       fits as many equal columns as the sheet width allows. break-inside:avoid
       keeps a column from splitting across a page. */
    .skills--columns {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(1.3in, 1fr));
        gap: 0.15rem 0.6rem;
        align-items: start;
    }
    .skills__col { break-inside: avoid; }
    .skills__colheading {
        display: block;
        font-weight: 700;
        border-bottom: 1px solid #ccc;
        padding-bottom: 0.08rem;
        margin-bottom: 0.15rem;
    }
    .skills__collist { list-style: none; margin: 0; padding: 0; }
    .skills__collist li { margin: 0.04rem 0; }

    /* ---------- Experience / Education items ---------- */
    .item { margin-top: 0.4rem; break-inside: avoid; }
    .item__head { display: flex; justify-content: space-between; align-items: baseline; gap: 0.75rem; }
    .item__org { font-weight: 700; font-size: 10.5pt; }
    .item__role { font-weight: 600; color: #333; }
    .item__dates { flex: 0 0 auto; font-size: 9pt; color: #555; white-space: nowrap; }
    .item__points { margin: 0.15rem 0 0; padding-left: 1.1rem; }
    .item__points li { margin: 0.08rem 0; }

    /* ---------- Print ---------- */
    @media print {
        :global(body) { background: #fff; }
        .toolbar { display: none; }
        .sheet {
            width: auto;
            min-height: 0;
            margin: 0;
            padding: 0;
            box-shadow: none;
        }
    }
    @page {
        size: letter;
        margin: 0.5in;
    }
</style>
