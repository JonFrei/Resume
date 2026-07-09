<script>
    import { enhance } from "$app/forms";
    import { autogrow } from "$lib/actions/autogrow.js";
    import "$lib/styles/editor-canvas.css";

    export let data;
    export let form;

    // =====================================================================
    // Editable state.
    //
    // The live /resume page merges experience ROLES and education entries into
    // ONE date-sorted timeline (see routes/resume/+page.svelte -> buildNodes).
    // This editor mirrors that exactly: we edit the merged, chronologically
    // sorted entries in place. Each entry is one role or one education item.
    //
    // Experience roles are grouped under a company in the saved payload, so an
    // experience entry carries both its own fields AND a `groupKey` (a stable
    // per-company id). On save we regroup entries sharing a groupKey back into
    // one experience[] { id, company, roles[] } object. Editing the company
    // name on an entry renames it across every role in that group.
    // =====================================================================

    function toItem(it) {
        if (it && typeof it === "object") return { text: it.text || "", tag: it.tag || "" };
        return { text: String(it), tag: "" };
    }

    let skills = (data.resume.skills || []).map((g) => ({
        heading: g.heading || "",
        tags: g.style === "tags",
        items: (g.items || []).map(toItem),
    }));

    // A monotonically increasing key generator for new group ids (kept off
    // Date/Math.random so it's deterministic within a session).
    let seq = 0;
    const nextKey = () => `k${seq++}`;

    // Flatten experience -> per-role entries, education -> entries; then merge.
    let entries = buildEntries(data.resume);

    function buildEntries(r) {
        const out = [];
        for (const job of r?.experience ?? []) {
            const groupKey = job.id || nextKey();
            for (const role of job.roles ?? []) {
                out.push({
                    kind: "experience",
                    groupKey,
                    company: job.company || "",
                    title: role.title || "",
                    dates: role.dates || "",
                    start: role.start ?? "",
                    end: role.end ?? "",
                    points: (role.points || []).map(String),
                });
            }
        }
        for (const edu of r?.education ?? []) {
            out.push({
                kind: "education",
                groupKey: edu.id || nextKey(),
                company: edu.school || "",          // school reuses `company` slot
                title: edu.credential || "",        // credential reuses `title` slot
                dates: edu.dates || "",
                start: edu.start ?? "",
                end: edu.end ?? "",
                points: (edu.points || []).map(String),
            });
        }
        return sortEntries(out);
    }

    // Same ordering the live page uses: newest end first (blank end = Present =
    // top), then newest start. Kept as a pure sort so re-sorting on year edits
    // matches the live spine precisely.
    const PRESENT = 9999;
    function sortEntries(list) {
        const yr = (v) => (v === "" || v == null ? null : Number(v));
        return [...list].sort((a, b) => {
            const ae = yr(a.end) == null ? PRESENT : yr(a.end);
            const be = yr(b.end) == null ? PRESENT : yr(b.end);
            if (be !== ae) return be - ae;
            return (yr(b.start) ?? 0) - (yr(a.start) ?? 0);
        });
    }

    // Inline <input>s bind to fields of the `entry` objects held in `entries`.
    // Mutating a nested field doesn't reassign `entries`, so on its own it
    // wouldn't re-fire the reactive derivations below. A single input handler on
    // the <form> (events bubble up) bumps `rev`; the derivations read `rev` so a
    // keystroke in any field re-sorts the timeline and rebuilds the payload.
    let rev = 0;
    const touch = () => (rev += 1);

    // The rendered node list: entries in live-page order, with the alternating
    // left/right branch side assigned by position, exactly like buildNodes.
    // Each node also gets a stable `anchor` id (groupKey, disambiguated when a
    // company holds multiple roles — using the entry's index WITHIN its group in
    // source order, mirroring buildNodes' `${job.id}-${i}` scheme) so the nav
    // card and its content block share an href. `entry` is the SAME object as in
    // `entries`, so binds flow straight back into it.
    $: nodes = (rev, sortEntries(entries).map((entry, i) => ({
        entry,
        kind: entry.kind,
        side: i % 2 === 0 ? "right" : "left",
        anchor: anchorFor(entry),
    })));

    function anchorFor(entry) {
        const sameGroup = entries.filter((e) => e.groupKey === entry.groupKey);
        if (sameGroup.length <= 1) return entry.groupKey;
        return `${entry.groupKey}-${sameGroup.indexOf(entry)}`;
    }

    // Present/oldest end caps, matching the live page.
    const capTop = "Present";
    $: capBottom = (rev, smallestYear(entries));
    function smallestYear(list) {
        const years = list
            .flatMap((n) => [n.start, n.end])
            .map((y) => (y === "" || y == null ? null : Number(y)))
            .filter((y) => typeof y === "number" && Number.isFinite(y));
        return years.length ? String(Math.min(...years)) : "";
    }

    const kindLabel = (k) => (k === "education" ? "Schooling" : "Experience");

    // --- Mutations (operate on `entries`; the sorted `nodes` view follows). ---
    function move(arr, i, dir) {
        const j = i + dir;
        if (j < 0 || j >= arr.length) return arr;
        const c = arr.slice();
        [c[i], c[j]] = [c[j], c[i]];
        return c;
    }

    // Skills
    const addGroup = () =>
        (skills = [...skills, { heading: "New group", tags: false, items: [{ text: "", tag: "" }] }]);
    const removeGroup = (i) => (skills = skills.filter((_, x) => x !== i));
    const moveGroup = (i, d) => (skills = move(skills, i, d));
    const addItem = (gi) => { skills[gi].items = [...skills[gi].items, { text: "", tag: "" }]; skills = skills; };
    const removeItem = (gi, ii) => { skills[gi].items = skills[gi].items.filter((_, x) => x !== ii); skills = skills; };

    // Timeline entries
    const newExperience = () => ({
        kind: "experience", groupKey: nextKey(), company: "New company",
        title: "New role", dates: "", start: "", end: "", points: [""],
    });
    const newEducation = () => ({
        kind: "education", groupKey: nextKey(), company: "New school",
        title: "Credential", dates: "", start: "", end: "", points: [""],
    });
    const addExperience = () => (entries = [...entries, newExperience()]);
    const addEducation = () => (entries = [...entries, newEducation()]);
    // Add another role to the SAME company as an existing entry (shares groupKey
    // + company so they serialize into one experience block).
    const addRoleToGroup = (node) =>
        (entries = [...entries, {
            kind: "experience", groupKey: node.groupKey, company: node.company,
            title: "New role", dates: "", start: "", end: "", points: [""],
        }]);
    const removeEntry = (node) => (entries = entries.filter((e) => e !== node));
    // Renaming a company/school on one entry renames every entry in its group.
    function renameGroup(node, value) {
        for (const e of entries) if (e.groupKey === node.groupKey) e.company = value;
        entries = entries;
    }
    const addPoint = (node) => { node.points = [...node.points, ""]; entries = entries; };
    const removePoint = (node, pi) => { node.points = node.points.filter((_, x) => x !== pi); entries = entries; };

    // --- Serialize back to the grouped payload parseResumePayload expects. ---
    const slugify = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    $: payload = (rev, JSON.stringify(buildPayload(skills, entries)));

    function buildPayload(sk, ents) {
        const experienceGroups = [];
        const byKey = new Map();
        const education = [];

        for (const e of ents) {
            if (e.kind === "education") {
                education.push({
                    id: e.groupKey && !e.groupKey.startsWith("k") ? e.groupKey : "",
                    school: e.company,
                    credential: e.title,
                    dates: e.dates,
                    start: e.start,
                    end: e.end,
                    points: e.points.filter((p) => p.trim()),
                });
                continue;
            }
            let group = byKey.get(e.groupKey);
            if (!group) {
                group = {
                    id: e.groupKey && !e.groupKey.startsWith("k") ? e.groupKey : "",
                    company: e.company,
                    roles: [],
                };
                byKey.set(e.groupKey, group);
                experienceGroups.push(group);
            }
            // Latest company edit wins for the whole group.
            group.company = e.company;
            group.roles.push({
                title: e.title,
                dates: e.dates,
                start: e.start,
                end: e.end,
                points: e.points.filter((p) => p.trim()),
            });
        }

        return {
            skills: sk.map((g) => ({
                heading: g.heading,
                style: g.tags ? "tags" : undefined,
                items: g.items.filter((it) => it.text.trim())
                    .map((it) => (it.tag.trim() ? { text: it.text, tag: it.tag } : it.text)),
            })),
            experience: experienceGroups,
            education,
        };
    }

    let saving = false;
    const submit = () => {
        saving = true;
        return async ({ update }) => { await update({ reset: false }); saving = false; };
    };
</script>

<svelte:head><title>Resume — Admin</title></svelte:head>

<div class="admin-wrap admin-wrap--wide resume-editor">
    <div class="admin-row">
        <h1 class="admin-title">Resume</h1>
        <a class="btn btn-sm" href="/admin">← Back</a>
    </div>

    {#if !data.hasDatabase}
        <p class="flash flash--err">
            No database is configured (DATABASE_URL unset). You can edit here, but
            changes can't be saved until a database is attached.
        </p>
    {/if}
    {#if form?.saved}<p class="flash flash--ok">Resume saved.</p>{/if}
    {#if form?.error}<p class="flash flash--err">{form.error}</p>{/if}

    <p class="editor-hint">
        This is your live resume page. Click any text to edit it in place; the
        timeline reorders itself by the start / end years, just like the live
        page. Hover an entry for its add / remove controls.
    </p>

    <form method="POST" use:enhance={submit} on:input={touch}>
        <input type="hidden" name="payload" value={payload} />

        <div class="canvas">
            <div class="canvas__bar">
                <span class="canvas__dot"></span><span class="canvas__dot"></span><span class="canvas__dot"></span>
                <span class="canvas__url">jonathan-freier.com/resume</span>
            </div>

            <main class="resume">
                <div class="resume__split">
                    <!-- ================= LEFT: TIMELINE NAV (live mirror) ================= -->
                    <nav class="tl" aria-label="Resume timeline">
                        <div class="tl__inner">
                            <a class="tl__skills" href="#skills">
                                Skills <span aria-hidden="true">↥</span>
                            </a>

                            <div class="tl__track">
                                <p class="tl__cap tl__cap--top">{capTop}</p>
                                <span class="tl__marker" aria-hidden="true"></span>

                                <ol class="tl__nodes">
                                    {#each nodes as n (n.anchor)}
                                        <li class="tlnode tlnode--{n.side} tlnode--{n.kind}">
                                            <a class="tlnode__card" href={`#${n.anchor}`}>
                                                <span class="tlnode__kind">{kindLabel(n.kind)}</span>
                                                <span class="tlnode__title">{n.entry.company || "Untitled"}</span>
                                                {#if n.entry.title}<span class="tlnode__sub">{n.entry.title}</span>{/if}
                                                {#if n.entry.dates}<span class="tlnode__dates">{n.entry.dates}</span>{/if}
                                            </a>
                                        </li>
                                    {/each}
                                </ol>

                                <span class="tl__marker" aria-hidden="true"></span>
                                {#if capBottom}<p class="tl__cap tl__cap--bottom">{capBottom}</p>{/if}
                            </div>
                        </div>
                    </nav>

                    <!-- ================= RIGHT: RESUME CONTENT ================= -->
                    <div class="resume__content">
                        <!-- ===== Skills ===== -->
                        <section id="skills" class="section editable">
                            <div class="tools tools--float">
                                <button class="iconbtn" type="button" title="Add skill group" on:click={addGroup}>＋</button>
                            </div>
                            <h2 class="section__title">Skills</h2>
                            <div class="skills">
                                {#each skills as g, gi (gi)}
                                    <div class="skills__group editable">
                                        <div class="tools tools--float">
                                            <label class="tagtoggle" title="Show items as pills"><input type="checkbox" bind:checked={g.tags} /> pills</label>
                                            <button class="iconbtn" type="button" title="Move up" on:click={() => moveGroup(gi, -1)} disabled={gi === 0}>↑</button>
                                            <button class="iconbtn" type="button" title="Move down" on:click={() => moveGroup(gi, 1)} disabled={gi === skills.length - 1}>↓</button>
                                            <button class="iconbtn iconbtn--danger" type="button" title="Remove group" on:click={() => removeGroup(gi)}>✕</button>
                                        </div>
                                        <h3 class="skills__heading"><input class="ce" bind:value={g.heading} placeholder="Group heading" /></h3>
                                        <ul class="skills__list" class:skills__list--tags={g.tags}>
                                            {#each g.items as it, ii (ii)}
                                                <li class="skills__item editable">
                                                    <input class="ce ce--inline" bind:value={it.text} placeholder="Skill" />
                                                    {#if !g.tags}<input class="ce ce--inline skills__tagfield" bind:value={it.tag} placeholder="tag (opt)" />{/if}
                                                    {#if it.tag && !g.tags}<span class="skills__tag">{it.tag}</span>{/if}
                                                    <button class="iconbtn iconbtn--danger item-x" type="button" title="Remove item" on:click={() => removeItem(gi, ii)}>✕</button>
                                                </li>
                                            {/each}
                                        </ul>
                                        <button class="add-inline" type="button" on:click={() => addItem(gi)}>＋ item</button>
                                    </div>
                                {/each}
                            </div>
                            <div class="section__add"><button class="add-inline" type="button" on:click={addGroup}>＋ Add skill group</button></div>
                        </section>

                        <!-- ===== Experience & Education (merged, date-sorted) ===== -->
                        <section class="section">
                            <h2 class="section__title">Experience &amp; Education</h2>

                            {#each nodes as n (n.anchor)}
                                <article id={n.anchor} class="entry entry--{n.kind} editable">
                                    <div class="tools tools--float">
                                        {#if n.kind === "experience"}
                                            <button class="iconbtn" type="button" title="Add another role at this company" on:click={() => addRoleToGroup(n.entry)}>＋role</button>
                                        {/if}
                                        <button class="iconbtn" type="button" title="Add bullet point" on:click={() => addPoint(n.entry)}>＋pt</button>
                                        <button class="iconbtn iconbtn--danger" type="button" title="Remove entry" on:click={() => removeEntry(n.entry)}>✕</button>
                                    </div>

                                    <div class="entry__head">
                                        <span class="entry__badge">{kindLabel(n.kind)}</span>
                                        <h3 class="entry__title">
                                            <input
                                                class="ce"
                                                value={n.entry.company}
                                                on:input={(e) => renameGroup(n.entry, e.target.value)}
                                                placeholder={n.kind === "education" ? "School / University" : "Company"}
                                            />
                                        </h3>
                                    </div>

                                    <div class="entry__meta">
                                        <p class="entry__sub"><input class="ce" bind:value={n.entry.title} placeholder={n.kind === "education" ? "Credential (e.g. B.S. in …)" : "Job title"} /></p>
                                        <p class="entry__dates"><input class="ce ce--inline" bind:value={n.entry.dates} placeholder="Jun 2020 – Present" /></p>
                                    </div>

                                    <div class="yearrow">
                                        <label>start <input class="ce yearfield" type="number" bind:value={n.entry.start} placeholder="2020" /></label>
                                        <label>end <input class="ce yearfield" type="number" bind:value={n.entry.end} placeholder="(blank = present)" /></label>
                                        <span class="yearrow__hint">years drive the timeline order; leave “end” blank for present</span>
                                    </div>

                                    <ul class="entry__points">
                                        {#each n.entry.points as pt, pi (pi)}
                                            <li class="editable point">
                                                <textarea class="ce" rows="1" use:autogrow bind:value={n.entry.points[pi]} placeholder="Accomplishment…"></textarea>
                                                <button class="iconbtn iconbtn--danger point-x" type="button" title="Remove point" on:click={() => removePoint(n.entry, pi)}>✕</button>
                                            </li>
                                        {/each}
                                    </ul>
                                    <button class="add-inline" type="button" on:click={() => addPoint(n.entry)}>＋ bullet point</button>
                                </article>
                            {/each}

                            <div class="section__add entry-add">
                                <button class="add-inline" type="button" on:click={addExperience}>＋ Add experience</button>
                                <button class="add-inline" type="button" on:click={addEducation}>＋ Add education</button>
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>

        <div class="save-bar">
            <button class="btn btn--solid" type="submit" disabled={saving || !data.hasDatabase}>
                {saving ? "Saving…" : "Save resume"}
            </button>
            <a class="btn btn-sm" href="/resume/" target="_blank" rel="noopener">Open live page ↗</a>
        </div>
    </form>
</div>

<style>
    /* Full-bleed override: the shared .admin-wrap--wide caps at 1160px and adds
       side padding — drop both here so the editing canvas can use the whole
       viewport for an accurate, roomy view of the live layout. */
    .resume-editor {
        max-width: none;
        padding-left: clamp(0.75rem, 2vw, 1.5rem);
        padding-right: clamp(0.75rem, 2vw, 1.5rem);
    }

    .editor-hint { color: var(--text-muted); margin-bottom: 1rem; font-size: 0.9rem; }

    /* =====================================================================
       Mirror of routes/resume/+page.svelte. The class structure + styling
       below are copied from the live page so editing happens on an accurate
       replica of the layout: the same two-panel split, the same date-sorted
       alternating branch timeline, the same merged content entries. Only the
       inline-edit affordances (.ce fields, .yearrow, hover .tools) are added.
       ===================================================================== */
    .resume {
        background: linear-gradient(180deg, var(--bg-page-start) 0%, var(--bg-page-end) 100%);
    }
    .resume__split {
        /* No max-width: fill the full-bleed wrapper so the content panel gets
           the whole remaining width. */
        margin: 0 auto;
        display: grid;
        grid-template-columns: minmax(240px, 280px) 1fr;
        gap: clamp(1rem, 3vw, 2.5rem);
        align-items: start;
        padding: clamp(1.5rem, 4vh, 3rem) clamp(1rem, 3vw, 2rem) clamp(3rem, 8vh, 5rem);
    }

    /* ===================== TIMELINE NAV ===================== */
    .tl {
        position: sticky;
        top: 1rem;
        align-self: start;
        max-height: calc(100vh - 2rem);
        overflow-y: auto;
        padding: clamp(1rem, 3vh, 2rem) 0.5rem clamp(2rem, 5vh, 3rem);
        border-right: 1px solid rgba(255, 255, 255, 0.12);
        scrollbar-width: thin;
        scrollbar-color: var(--accent) transparent;
    }
    .tl::-webkit-scrollbar { width: 6px; }
    .tl::-webkit-scrollbar-track { background: transparent; }
    .tl::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, var(--accent) 0%, var(--accent-dark) 100%);
        border-radius: 999px;
    }
    .tl::-webkit-scrollbar-thumb:hover { background: var(--accent-dark); }
    .tl__inner { min-height: 100%; }
    .tl__skills {
        display: block;
        width: calc(100% - 1rem);
        margin: 0 auto 1.25rem;
        text-align: center;
        background: linear-gradient(180deg, var(--accent) 0%, var(--accent-dark) 130%);
        color: var(--text-on-accent);
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        font-size: 0.9rem;
        padding: 0.7rem 1rem;
        border-radius: var(--radius);
        box-shadow: 0 6px 16px -8px rgba(0, 0, 0, 0.6);
        transition: transform var(--speed) var(--ease), box-shadow var(--speed) var(--ease);
    }
    .tl__skills:hover, .tl__skills:focus-visible {
        transform: translateY(-1px);
        box-shadow: 0 10px 22px -8px rgba(0, 0, 0, 0.7);
    }

    .tl__track {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .tl__track::before {
        content: "";
        position: absolute;
        top: 0;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 3px;
        background: linear-gradient(
            180deg,
            var(--accent) 0%,
            rgba(255, 255, 255, 0.35) 8%,
            rgba(255, 255, 255, 0.35) 92%,
            var(--accent-dark) 100%
        );
        border-radius: 3px;
    }
    .tl__cap {
        position: relative;
        margin: 0;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--bg-deep);
        background: var(--bg-mid);
        padding: 0.15rem 0.5rem;
        border-radius: 999px;
    }
    .tl__marker {
        position: relative;
        width: 15px;
        height: 15px;
        margin: 0.4rem 0;
        border-radius: 50%;
        background: var(--bg-deep);
        border: 3px solid var(--accent);
    }

    .tl__nodes {
        position: relative;
        list-style: none;
        margin: 0;
        padding: 0;
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: clamp(1.25rem, 3vh, 2rem);
    }

    .tlnode {
        position: relative;
        display: flex;
        min-height: 56px;
        align-items: center;
    }
    .tlnode::before {
        content: "";
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 15px;
        height: 15px;
        border-radius: 50%;
        background: var(--bg-deep);
        border: 3px solid var(--accent);
        z-index: 2;
    }
    .tlnode--education::before { border-color: var(--bg-light); }
    .tlnode::after {
        content: "";
        position: absolute;
        top: 50%;
        width: 12px;
        height: 2px;
        background: rgba(255, 255, 255, 0.35);
    }
    .tlnode--left::after { right: calc(50% + 7.5px); }
    .tlnode--right::after { left: calc(50% + 7.5px); }
    .tlnode--left { justify-content: flex-start; }
    .tlnode--right { justify-content: flex-end; }

    .tlnode__card {
        position: relative;
        z-index: 3;
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
        width: 74%;
        padding: 0.5rem 0.65rem;
        border-radius: var(--radius);
        background: var(--bg-deep);
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-left: 3px solid var(--accent);
        box-shadow: 0 4px 12px -6px rgba(0, 0, 0, 0.6);
        transition: transform var(--speed) var(--ease),
            border-color var(--speed) var(--ease), background var(--speed) var(--ease);
    }
    .tlnode--education .tlnode__card { border-left-color: var(--bg-light); }
    .tlnode--left .tlnode__card {
        text-align: right;
        border-left: 1px solid rgba(255, 255, 255, 0.14);
        border-right: 3px solid var(--accent);
    }
    .tlnode--left.tlnode--education .tlnode__card { border-right-color: var(--bg-light); }
    .tlnode__card:hover, .tlnode__card:focus-visible {
        transform: translateY(-1px);
        background: var(--surface);
    }

    .tlnode__kind {
        font-size: 0.58rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        font-weight: 700;
        color: var(--accent);
    }
    .tlnode--education .tlnode__kind { color: var(--bg-light); }
    .tlnode__title { font-size: 0.85rem; font-weight: 700; color: var(--text); line-height: 1.2; }
    .tlnode__sub { font-size: 0.7rem; color: var(--text-muted); }
    .tlnode__dates { font-size: 0.64rem; color: var(--text-muted); letter-spacing: 0.03em; }

    /* ===================== RESUME CONTENT ===================== */
    .section { margin-bottom: clamp(2.5rem, 6vh, 4rem); padding-top: clamp(1rem, 3vh, 2rem); }
    .section__title {
        font-size: clamp(1.6rem, 4vw, 2.4rem);
        color: var(--text);
        padding-bottom: 0.4rem;
        margin-bottom: 1.5rem;
        border-bottom: 3px solid var(--accent);
    }
    .section__add { margin-top: 1rem; }
    .entry-add { display: flex; gap: 0.75rem; flex-wrap: wrap; }

    .skills { display: flex; flex-direction: column; gap: 1.5rem; }
    .skills__group { background: rgba(9, 82, 86, 0.15); border-radius: var(--radius); padding: 1rem 1.25rem; }
    .skills__heading {
        font-size: 1.15rem;
        color: var(--bg-deep);
        padding-bottom: 0.4rem;
        margin-bottom: 0.75rem;
        border-bottom: 2px solid var(--accent);
    }
    .skills__list {
        list-style: none;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 0.4rem 1.5rem;
        color: var(--text);
    }
    .skills__item { display: flex; align-items: center; gap: 0.4rem; }
    .skills__list--tags { display: flex; flex-wrap: wrap; gap: 0.5rem 0.75rem; }
    .skills__list--tags .skills__item { background: var(--bg-deep); color: var(--text); padding: 0.3rem 0.75rem; border-radius: 999px; font-size: 0.9rem; }
    .skills__tagfield { max-width: 10ch; opacity: 0.85; }
    .skills__tag { display: inline-block; padding: 0.1rem 0.6rem; background: var(--accent); color: var(--text-on-accent); border-radius: 999px; font-size: 0.75rem; }
    .item-x, .point-x { flex-shrink: 0; width: 22px; height: 22px; font-size: 0.7rem; }

    /* content entries (experience + education) */
    .entry {
        margin-bottom: 2.5rem;
        padding-left: 1rem;
        border-left: 3px solid var(--accent);
        scroll-margin-top: 1.5rem;
    }
    .entry--education { border-left-color: var(--bg-light); }
    .entry__head { display: flex; align-items: baseline; flex-wrap: wrap; gap: 0.5rem 0.75rem; }
    .entry__head .entry__title { flex: 1; min-width: 12ch; }
    .entry__badge {
        font-size: 0.62rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        font-weight: 700;
        padding: 0.15rem 0.5rem;
        border-radius: 999px;
        background: var(--accent);
        color: var(--text-on-accent);
    }
    .entry--education .entry__badge { background: var(--bg-light); color: var(--bg-deep); }
    .entry__title { font-size: 1.5rem; color: var(--text); }
    .entry__meta {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 0.25rem 1rem;
        margin-top: 0.5rem;
        color: var(--bg-deep);
        font-weight: 700;
    }
    .entry__meta p { margin: 0; flex: 1; min-width: 12ch; }
    .entry__dates { text-align: right; }
    .yearrow {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
        margin: 0.5rem 0 0;
        font-size: 0.72rem;
        color: var(--text-muted);
        font-weight: 700;
    }
    .yearrow label { display: inline-flex; align-items: center; gap: 0.3rem; }
    .yearfield { width: 8ch; }
    .yearrow__hint { font-weight: 400; opacity: 0.8; }
    .entry__points {
        margin: 0.6rem 0 0;
        padding-left: 1.4rem;
        color: var(--text);
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .point { display: flex; align-items: flex-start; gap: 0.4rem; }
    .point .ce { flex: 1; }
    .tagtoggle { display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.7rem; color: #fff; font-weight: 700; }

    /* ===================== RESPONSIVE ===================== */
    @media (max-width: 820px) {
        .resume__split { grid-template-columns: 1fr; }
        .tl {
            position: static;
            max-height: none;
            overflow: visible;
            border-right: none;
            border-bottom: 1px solid rgba(255, 255, 255, 0.12);
            padding: 0.75rem 0.5rem 1rem;
        }
        .tl__skills { width: auto; display: inline-block; margin: 0 0 0.75rem; }
        .tl__track { flex-direction: row; align-items: center; overflow-x: auto; padding-bottom: 0.5rem; }
        .tl__track::before {
            top: 50%; bottom: auto; left: 0; right: 0;
            transform: translateY(-50%); width: auto; height: 3px;
        }
        .tl__cap { flex: none; }
        .tl__marker { flex: none; margin: 0 0.35rem; }
        .tl__nodes { flex-direction: row; width: auto; gap: 0.6rem; padding: 0 0.35rem; }
        .tlnode { min-height: 0; }
        .tlnode::before, .tlnode::after { display: none; }
        .tlnode__card {
            width: auto; min-width: 150px; text-align: left !important;
            border: 2px solid var(--accent) !important; background: var(--bg-deep); white-space: normal;
        }
        .tlnode--education .tlnode__card { border-color: var(--bg-light) !important; }
        .entry { padding-left: 0.75rem; }
    }
</style>
