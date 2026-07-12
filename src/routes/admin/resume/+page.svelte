<script>
    import { enhance } from "$app/forms";
    import { page } from "$app/stores";
    import { autogrow } from "$lib/actions/autogrow.js";
    import "$lib/styles/editor-canvas.css";

    export let data;
    export let form;

    // Public-site origin so the "Open live page" link points at the public host
    // (a relative link on the admin host is redirected back to /admin).
    $: siteBase = $page.data.siteUrl || "";

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

    // A monotonically increasing key generator (kept off Date/Math.random so
    // it's deterministic within a session). Used for both experience group ids
    // and stable per-skill-group ids that bands reference.
    let seq = 0;
    const nextKey = () => `k${seq++}`;

    // Each skill group carries a stable client id (`sid`) so layout bands can
    // reference groups by identity across add / remove / reorder — indices would
    // shift out from under the bands. On save we map sids → current indices.
    let skills = (data.resume.skills || []).map((g) => ({
        sid: nextKey(),
        heading: g.heading || "",
        tags: g.style === "tags",
        items: (g.items || []).map(toItem),
    }));

    // Section-wide skills layout: "rows" (stacked groups, default) or "columns"
    // (groups side by side, like a printed resume). This is the FALLBACK layout
    // for any group not placed in a band. Drives the preview + saved payload.
    let skillsLayout = data.resume.skillsLayout === "columns" ? "columns" : "rows";

    // Layout BANDS: ordered groupings that render together in one layout, letting
    // you mix (e.g. "Languages" as a row, three technical groups as columns) in
    // one section. Each band = { layout: "row"|"columns", sids: [stable ids] }.
    // Loaded from the saved index-based bands by mapping saved indices → the sid
    // of the group at that index. Groups in no band render in the section default.
    let bands = (Array.isArray(data.resume.skillsBands) ? data.resume.skillsBands : [])
        .map((b) => ({
            layout: b?.layout === "columns" ? "columns" : "row",
            sids: (Array.isArray(b?.groups) ? b.groups : [])
                .map((i) => skills[i]?.sid)
                .filter(Boolean),
        }))
        .filter((b) => b.sids.length);

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

    const kindLabel = (k) => (k === "education" ? "Education" : "Experience");

    // What the timeline card shows for dates: the free-text `dates` field if the
    // user typed one, otherwise a derived "start – end" from the year fields so
    // editing the years is immediately reflected on the card (end blank = Present).
    function cardDates(entry) {
        if (entry.dates && entry.dates.trim()) return entry.dates;
        const s = entry.start === "" || entry.start == null ? "" : String(entry.start);
        const e = entry.end === "" || entry.end == null ? "Present" : String(entry.end);
        if (!s && (e === "Present" || !e)) return "";
        return `${s || "?"} – ${e}`;
    }

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
        (skills = [...skills, { sid: nextKey(), heading: "New group", tags: false, items: [{ text: "", tag: "" }] }]);
    // Removing a group drops it from any band; a band whose last group was the
    // one removed is pruned (it can never be re-filled — that group is gone).
    function removeGroup(i) {
        const sid = skills[i]?.sid;
        skills = skills.filter((_, x) => x !== i);
        if (sid) {
            forgetSid(sid);
            bands = bands.filter((b) => b.sids.length);
        }
    }
    const moveGroup = (i, d) => (skills = move(skills, i, d));
    const addItem = (gi) => { skills[gi].items = [...skills[gi].items, { text: "", tag: "" }]; skills = skills; };
    const removeItem = (gi, ii) => { skills[gi].items = skills[gi].items.filter((_, x) => x !== ii); skills = skills; };

    // --- Layout bands -----------------------------------------------------
    // Drop a sid from every band. Does NOT prune empty bands: a band the user
    // just created is legitimately empty until a group is assigned to it, and
    // assignGroupToBand calls this first — pruning here would delete the target
    // band mid-assignment. Empty bands are cleaned up only on group removal
    // (removeGroup) and at serialize time.
    function forgetSid(sid) {
        bands = bands.map((b) => ({ ...b, sids: b.sids.filter((s) => s !== sid) }));
    }
    // The band a group currently belongs to (index into `bands`), or -1 if it
    // renders in the section default. A sid lives in at most one band.
    const bandIndexOfSid = (sid) => bands.findIndex((b) => b.sids.includes(sid));
    // A friendly label for a band (its 1-based number + layout) for the picker.
    const bandLabel = (bi) => `Band ${bi + 1} · ${bands[bi].layout === "columns" ? "Columns" : "Row"}`;

    const addBand = (layout = "columns") => (bands = [...bands, { layout, sids: [] }]);
    const removeBand = (bi) => (bands = bands.filter((_, x) => x !== bi));
    const setBandLayout = (bi, layout) => { bands[bi].layout = layout; bands = bands; };
    const moveBand = (bi, d) => (bands = move(bands, bi, d));

    // Move a group to a target band (bi), or to the section default (bi === -1).
    // Pulls it out of whatever band it was in first so it lives in one place.
    function assignGroupToBand(sid, bi) {
        forgetSid(sid);
        if (bi >= 0 && bands[bi]) { bands[bi].sids = [...bands[bi].sids, sid]; bands = bands; }
    }

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

    // --- Preview render blocks (mirror the live page's buildSkillBlocks, but
    // keyed on the editor's stable sids instead of indices). Each band becomes
    // one block in order; groups in no band form a trailing block in the section
    // default layout. Recomputed on any skills/bands/layout edit via `rev`. ---
    $: previewBlocks = (rev, bands, skillsLayout, buildPreviewBlocks(skills, bands, skillsLayout));

    function buildPreviewBlocks(sk, bnds, deflt) {
        const bySid = new Map(sk.map((g) => [g.sid, g]));
        const claimed = new Set();
        const blocks = [];
        for (const b of bnds) {
            const groups = [];
            for (const sid of b.sids) {
                const g = bySid.get(sid);
                if (g && !claimed.has(sid)) { claimed.add(sid); groups.push(g); }
            }
            if (groups.length) blocks.push({ layout: b.layout === "columns" ? "columns" : "row", groups });
        }
        const leftover = sk.filter((g) => !claimed.has(g.sid));
        if (leftover.length) blocks.push({ layout: deflt === "columns" ? "columns" : "row", groups: leftover });
        return blocks;
    }

    // Items past this count in a column group flow into a 2nd sub-column so the
    // group is shorter. Matches SUBCOLUMN_THRESHOLD in resumeSkills.js.
    const subCols = (n) => (n > 6 ? 2 : 1);

    // Current index of a group object in `skills` — the preview iterates blocks
    // (group objects), but the move/remove/add-item mutations key on `skills`
    // indices. Read `rev`/`skills` so it re-resolves after any reorder.
    $: idxOf = (rev, skills, (g) => skills.indexOf(g));

    // --- Serialize back to the grouped payload parseResumePayload expects. ---
    const slugify = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    $: payload = (rev, skillsLayout, bands, JSON.stringify(buildPayload(skills, entries)));

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

        // The parser drops empty groups (no heading AND no items), which shifts
        // indices. Serialize bands against that SAME filtered set: keep only
        // groups that survive, remember each survivor's sid → final index, then
        // translate each band's sids to those indices. This keeps the saved
        // index-based bands aligned with the saved skills array.
        const kept = sk.filter((g) => g.heading.trim() || g.items.some((it) => it.text.trim()));
        const indexOfSid = new Map(kept.map((g, i) => [g.sid, i]));
        const skillsBands = bands
            .map((b) => ({
                layout: b.layout === "columns" ? "columns" : "row",
                groups: b.sids.map((s) => indexOfSid.get(s)).filter((i) => i != null),
            }))
            .filter((b) => b.groups.length);

        return {
            skills: kept.map((g) => ({
                heading: g.heading,
                style: g.tags ? "tags" : undefined,
                items: g.items.filter((it) => it.text.trim())
                    .map((it) => (it.tag.trim() ? { text: it.text, tag: it.tag } : it.text)),
            })),
            skillsLayout,
            skillsBands,
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

    <form method="POST" action="?/content" use:enhance={submit} on:input={touch}>
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
                                                {#if (rev, cardDates(n.entry))}<span class="tlnode__dates">{cardDates(n.entry)}</span>{/if}
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

                            <!-- Layout controls: the section DEFAULT (fallback for
                                 groups in no band) + the band manager. Bands let
                                 you mix layouts — e.g. one row + a set of columns. -->
                            <div class="layout-controls">
                                <div class="layout-switch">
                                    <span class="layout-switch__label">Default layout</span>
                                    <label class:on={skillsLayout === "rows"}>
                                        <input type="radio" bind:group={skillsLayout} value="rows" /> Rows
                                    </label>
                                    <label class:on={skillsLayout === "columns"}>
                                        <input type="radio" bind:group={skillsLayout} value="columns" /> Columns
                                    </label>
                                    <span class="layout-switch__hint">Applies to any group not placed in a band below.</span>
                                </div>

                                <div class="bands">
                                    <div class="bands__head">
                                        <span class="layout-switch__label">Layout bands</span>
                                        <button class="add-inline" type="button" on:click={() => addBand("columns")}>＋ Columns band</button>
                                        <button class="add-inline" type="button" on:click={() => addBand("row")}>＋ Row band</button>
                                    </div>
                                    {#if bands.length}
                                        <ul class="bands__list">
                                            {#each bands as b, bi (bi)}
                                                <li class="band">
                                                    <span class="band__name">Band {bi + 1}</span>
                                                    <label class="band__layout">
                                                        <select bind:value={b.layout} on:change={() => (bands = bands)}>
                                                            <option value="columns">Columns</option>
                                                            <option value="row">Row</option>
                                                        </select>
                                                    </label>
                                                    <span class="band__count">{b.sids.length} group{b.sids.length === 1 ? "" : "s"}</span>
                                                    <button class="iconbtn" type="button" title="Move band up" on:click={() => moveBand(bi, -1)} disabled={bi === 0}>↑</button>
                                                    <button class="iconbtn" type="button" title="Move band down" on:click={() => moveBand(bi, 1)} disabled={bi === bands.length - 1}>↓</button>
                                                    <button class="iconbtn iconbtn--danger" type="button" title="Delete band (its groups return to the default)" on:click={() => removeBand(bi)}>✕</button>
                                                </li>
                                            {/each}
                                        </ul>
                                    {:else}
                                        <p class="bands__empty">No bands yet — every group uses the default layout. Add a band, then assign groups to it from the “Band” picker on each group.</p>
                                    {/if}
                                </div>
                            </div>

                            <!-- Preview: rendered block-by-block exactly like the
                                 live page. Each block is a band (or the trailing
                                 default block); each group keeps inline editing +
                                 a Band picker to move it between blocks. -->
                            {#each previewBlocks as block}
                                <div class="skills skills--{block.layout === 'columns' ? 'columns' : 'rows'}">
                                    {#each block.groups as g (g.sid)}
                                        <div class="skills__group editable" style={block.layout === "columns" ? `--subcols:${subCols(g.items.length)};` : ""}>
                                            <div class="tools tools--float">
                                                <label class="bandpick" title="Which layout band this group belongs to">
                                                    band
                                                    <!-- One-way select: `selected` is set explicitly per option (keyed on
                                                         the group's current band) so selection survives the previewBlocks
                                                         re-render; the change handler coerces the string value back to a
                                                         number. bandIndexOfSid reads `bands` so this re-evaluates on edits. -->
                                                    <select on:change={(e) => assignGroupToBand(g.sid, Number(e.currentTarget.value))}>
                                                        <option value="-1" selected={bandIndexOfSid(g.sid) === -1}>default</option>
                                                        {#each bands as _, bi}
                                                            <option value={bi} selected={bandIndexOfSid(g.sid) === bi}>{bandLabel(bi)}</option>
                                                        {/each}
                                                    </select>
                                                </label>
                                                <label class="tagtoggle" title="Show items as pills"><input type="checkbox" bind:checked={g.tags} /> pills</label>
                                                <button class="iconbtn" type="button" title="Move up" on:click={() => moveGroup(idxOf(g), -1)} disabled={idxOf(g) === 0}>↑</button>
                                                <button class="iconbtn" type="button" title="Move down" on:click={() => moveGroup(idxOf(g), 1)} disabled={idxOf(g) === skills.length - 1}>↓</button>
                                                <button class="iconbtn iconbtn--danger" type="button" title="Remove group" on:click={() => removeGroup(idxOf(g))}>✕</button>
                                            </div>
                                            <h3 class="skills__heading"><input class="ce" bind:value={g.heading} placeholder="Group heading" /></h3>
                                            <ul class="skills__list" class:skills__list--tags={g.tags}>
                                                {#each g.items as it, ii (ii)}
                                                    <li class="skills__item editable">
                                                        <input class="ce ce--inline" bind:value={it.text} placeholder="Skill" />
                                                        {#if !g.tags}<input class="ce ce--inline skills__tagfield" bind:value={it.tag} placeholder="tag (opt)" />{/if}
                                                        {#if it.tag && !g.tags}<span class="skills__tag">{it.tag}</span>{/if}
                                                        <button class="iconbtn iconbtn--danger item-x" type="button" title="Remove item" on:click={() => removeItem(idxOf(g), ii)}>✕</button>
                                                    </li>
                                                {/each}
                                            </ul>
                                            <button class="add-inline" type="button" on:click={() => addItem(idxOf(g))}>＋ item</button>
                                        </div>
                                    {/each}
                                </div>
                            {/each}
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
            <a class="btn btn-sm" href="{siteBase}/resume/" target="_blank" rel="noopener">Open live page ↗</a>
        </div>
    </form>
</div>

<style>
    /* 90% of the display width, centered — matches the sub-tab nav above so the
       editing canvas lines up under it, instead of the 1160px .admin-wrap--wide
       cap. Wide enough for a roomy view of the live layout, with side breathing room. */
    .resume-editor {
        max-width: 90%;
    }

    .editor-hint { color: var(--text-muted); margin-bottom: 1rem; font-size: 0.9rem; }

    /* Editable fields sit on the dark canvas. `.ce` inherits `color` from its
       surrounding real class, and some of those (roles, dates, skill headings)
       are dark-on-dark here — unreadable. Force editable inputs to a light,
       high-contrast color so every field stands out from the background while
       the non-editable rendered text keeps the real page's colors. */
    .resume-editor :global(.ce) { color: var(--text); }
    .resume-editor :global(.ce::placeholder) { color: rgba(255, 255, 255, 0.45); }
    /* Give the year number fields a faint filled box so they read as fields. */
    .resume-editor .yearfield {
        color: var(--text);
        background: rgba(0, 0, 0, 0.28);
        border: 1px solid rgba(255, 255, 255, 0.25);
    }

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
    .skills + .skills { margin-top: 1.25rem; } /* stack multiple band blocks */
    /* Columns preview: mirror the live page — groups side by side, each with a
       vertical item list. auto-fit wraps to fewer columns as the canvas narrows. */
    .skills--columns {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 1.25rem;
        align-items: start;
    }
    /* Item list flows into --subcols sub-columns (set per group) so a long list
       stays short; equal-height headings keep lists aligned when a heading wraps.
       Tag/pill lists keep wrapping as pills (not multi-column). */
    .skills--columns .skills__list:not(.skills__list--tags) {
        display: block;
        columns: var(--subcols, 1);
        column-gap: 1rem;
    }
    .skills--columns .skills__list:not(.skills__list--tags) .skills__item { break-inside: avoid; }
    .skills--columns .skills__heading { min-height: 2.8em; display: flex; align-items: flex-end; }
    .skills__group { background: rgba(9, 82, 86, 0.15); border-radius: var(--radius); padding: 1rem 1.25rem; }

    /* Layout controls: default switch + band manager, stacked in a panel. */
    .layout-controls {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        margin-bottom: 1.5rem;
        padding: 1rem 1.1rem;
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: var(--radius);
    }
    /* Rows / Columns layout switch. */
    .layout-switch {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.5rem;
    }
    .layout-switch__label {
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--text-muted);
    }
    .layout-switch label {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text);
        padding: 0.25rem 0.7rem;
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 999px;
        cursor: pointer;
    }
    .layout-switch label.on {
        background: var(--accent);
        color: var(--text-on-accent);
        border-color: var(--accent);
    }
    .layout-switch label input { accent-color: var(--accent); }
    .layout-switch__hint { font-size: 0.72rem; color: var(--text-muted); }

    /* Band manager. */
    .bands { display: flex; flex-direction: column; gap: 0.5rem; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 0.75rem; }
    .bands__head { display: flex; align-items: center; flex-wrap: wrap; gap: 0.6rem; }
    .bands__empty { margin: 0; font-size: 0.75rem; color: var(--text-muted); }
    .bands__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
    .band {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.35rem 0.5rem;
        background: rgba(0, 0, 0, 0.25);
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: var(--radius);
    }
    .band__name { font-size: 0.8rem; font-weight: 700; color: var(--text); }
    .band__count { font-size: 0.72rem; color: var(--text-muted); margin-left: auto; }
    .band__layout select,
    .bandpick select {
        background: rgba(0, 0, 0, 0.4);
        color: var(--text);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 6px;
        padding: 0.15rem 0.35rem;
        font-size: 0.78rem;
    }
    .band__layout select option,
    .bandpick select option { color: #1a1a1a; background: #fff; }
    /* Per-group band picker sits in the floating tools row. */
    .bandpick {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.68rem;
        font-weight: 700;
        color: #fff;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }
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
    .skills__list--tags .skills__item { background: var(--bg-light); color: var(--text); padding: 0.3rem 0.85rem; border: 1px solid color-mix(in srgb, var(--accent) 55%, transparent); border-radius: 999px; font-size: 0.9rem; box-shadow: 0 2px 6px -3px rgba(0, 0, 0, 0.6); }
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
        /* Match the public resume: hide the timeline preview on small screens and
           give the full canvas width to the editable content. min-width:0 lets the
           single-column grid track shrink to the canvas instead of being clipped. */
        .resume__split { grid-template-columns: 1fr; min-width: 0; }
        .resume__content { min-width: 0; }
        .tl { display: none; }
        .entry { padding-left: 0.75rem; }
    }
</style>
