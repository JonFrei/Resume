<script>
    import { enhance } from "$app/forms";
    import { autogrow } from "$lib/actions/autogrow.js";
    import "$lib/styles/editor-canvas.css";

    export let data;
    export let form;

    // --- Editable state, deep-copied from the loaded resume. ---
    function toItem(it) {
        if (it && typeof it === "object") return { text: it.text || "", tag: it.tag || "" };
        return { text: String(it), tag: "" };
    }
    let skills = (data.resume.skills || []).map((g) => ({
        heading: g.heading || "",
        tags: g.style === "tags",
        items: (g.items || []).map(toItem),
    }));

    let experience = (data.resume.experience || []).map((j) => ({
        id: j.id || "",
        company: j.company || "",
        roles: (j.roles || []).map((r) => ({
            title: r.title || "",
            dates: r.dates || "",
            start: r.start ?? "",
            end: r.end ?? "",
            points: (r.points || []).map(String),
        })),
    }));

    let education = (data.resume.education || []).map((e) => ({
        id: e.id || "",
        school: e.school || "",
        credential: e.credential || "",
        dates: e.dates || "",
        start: e.start ?? "",
        end: e.end ?? "",
        points: (e.points || []).map(String),
    }));

    function move(arr, i, dir) {
        const j = i + dir;
        if (j < 0 || j >= arr.length) return arr;
        const c = arr.slice();
        [c[i], c[j]] = [c[j], c[i]];
        return c;
    }

    // --- Skills ---
    const addGroup = () =>
        (skills = [...skills, { heading: "New group", tags: false, items: [{ text: "", tag: "" }] }]);
    const removeGroup = (i) => (skills = skills.filter((_, x) => x !== i));
    const moveGroup = (i, d) => (skills = move(skills, i, d));
    const addItem = (gi) => { skills[gi].items = [...skills[gi].items, { text: "", tag: "" }]; skills = skills; };
    const removeItem = (gi, ii) => { skills[gi].items = skills[gi].items.filter((_, x) => x !== ii); skills = skills; };

    // --- Experience ---
    const newRole = () => ({ title: "New role", dates: "", start: "", end: "", points: [""] });
    const addJob = () => (experience = [...experience, { id: "", company: "New company", roles: [newRole()] }]);
    const removeJob = (i) => (experience = experience.filter((_, x) => x !== i));
    const moveJob = (i, d) => (experience = move(experience, i, d));
    const addRole = (ji) => { experience[ji].roles = [...experience[ji].roles, newRole()]; experience = experience; };
    const removeRole = (ji, ri) => { experience[ji].roles = experience[ji].roles.filter((_, x) => x !== ri); experience = experience; };
    const moveRole = (ji, ri, d) => { experience[ji].roles = move(experience[ji].roles, ri, d); experience = experience; };
    const addPoint = (ji, ri) => { experience[ji].roles[ri].points = [...experience[ji].roles[ri].points, ""]; experience = experience; };
    const removePoint = (ji, ri, pi) => { experience[ji].roles[ri].points = experience[ji].roles[ri].points.filter((_, x) => x !== pi); experience = experience; };

    // --- Education ---
    const newEdu = () => ({ id: "", school: "New school", credential: "", dates: "", start: "", end: "", points: [] });
    const addEdu = () => (education = [...education, newEdu()]);
    const removeEdu = (i) => (education = education.filter((_, x) => x !== i));
    const moveEdu = (i, d) => (education = move(education, i, d));
    const addEduPoint = (ei) => { education[ei].points = [...education[ei].points, ""]; education = education; };
    const removeEduPoint = (ei, pi) => { education[ei].points = education[ei].points.filter((_, x) => x !== pi); education = education; };

    const slugify = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const jobAnchor = (j, i) => j.id || `exp-${slugify(j.company) || i}`;

    // --- Payload matching parseResumePayload ---
    $: payload = JSON.stringify({
        skills: skills.map((g) => ({
            heading: g.heading,
            style: g.tags ? "tags" : undefined,
            items: g.items.filter((it) => it.text.trim())
                .map((it) => (it.tag.trim() ? { text: it.text, tag: it.tag } : it.text)),
        })),
        experience: experience.map((j) => ({
            id: j.id,
            company: j.company,
            roles: j.roles.map((r) => ({
                title: r.title, dates: r.dates, start: r.start, end: r.end,
                points: r.points.filter((p) => p.trim()),
            })),
        })),
        education: education.map((e) => ({
            id: e.id, school: e.school, credential: e.credential, dates: e.dates,
            start: e.start, end: e.end, points: e.points.filter((p) => p.trim()),
        })),
    });

    let saving = false;
    const submit = () => {
        saving = true;
        return async ({ update }) => { await update({ reset: false }); saving = false; };
    };
</script>

<svelte:head><title>Resume — Admin</title></svelte:head>

<div class="admin-wrap admin-wrap--wide">
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
        This is your live resume page. Click any text to edit it in place; hover a
        section for its add / remove / reorder controls.
    </p>

    <form method="POST" use:enhance={submit}>
        <input type="hidden" name="payload" value={payload} />

        <div class="canvas">
            <div class="canvas__bar">
                <span class="canvas__dot"></span><span class="canvas__dot"></span><span class="canvas__dot"></span>
                <span class="canvas__url">jonathan-freier.com/resume</span>
            </div>

            <main class="resume">
                <div class="resume__wrap">
                    <!-- ===== Skills ===== -->
                    <section class="section editable">
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

                    <!-- ===== Experience (timeline) ===== -->
                    <section class="section editable">
                        <div class="tools tools--float">
                            <button class="iconbtn" type="button" title="Add job" on:click={addJob}>＋</button>
                        </div>
                        <h2 class="section__title">Professional Experience</h2>

                        <div class="resume__layout">
                            <nav class="timeline" aria-label="Experience timeline">
                                <p class="timeline__cap timeline__cap--top">Present</p>
                                <span class="timeline__marker" aria-hidden="true"></span>
                                <ul class="timeline__nodes">
                                    {#each experience as job, ji}
                                        <li class="node"><span class="node__link"><span class="node__dot" aria-hidden="true"></span><span class="node__label">{job.company || `Job ${ji + 1}`}</span></span></li>
                                    {/each}
                                </ul>
                                <span class="timeline__marker" aria-hidden="true"></span>
                                <p class="timeline__cap timeline__cap--bottom">1993</p>
                            </nav>

                            <div class="resume__content">
                                {#each experience as job, ji (ji)}
                                    <article id={jobAnchor(job, ji)} class="job editable">
                                        <div class="tools tools--float">
                                            <button class="iconbtn" type="button" title="Add role" on:click={() => addRole(ji)}>＋role</button>
                                            <button class="iconbtn" type="button" title="Move up" on:click={() => moveJob(ji, -1)} disabled={ji === 0}>↑</button>
                                            <button class="iconbtn" type="button" title="Move down" on:click={() => moveJob(ji, 1)} disabled={ji === experience.length - 1}>↓</button>
                                            <button class="iconbtn iconbtn--danger" type="button" title="Remove job" on:click={() => removeJob(ji)}>✕</button>
                                        </div>
                                        <h3 class="job__company"><input class="ce" bind:value={job.company} placeholder="Company" /></h3>

                                        {#each job.roles as role, ri (ri)}
                                            <div class="role editable">
                                                <div class="tools tools--float">
                                                    <button class="iconbtn" type="button" title="Move role up" on:click={() => moveRole(ji, ri, -1)} disabled={ri === 0}>↑</button>
                                                    <button class="iconbtn" type="button" title="Move role down" on:click={() => moveRole(ji, ri, 1)} disabled={ri === job.roles.length - 1}>↓</button>
                                                    <button class="iconbtn iconbtn--danger" type="button" title="Remove role" on:click={() => removeRole(ji, ri)}>✕</button>
                                                </div>
                                                <div class="job__role">
                                                    <p class="job__title"><input class="ce" bind:value={role.title} placeholder="Job title" /></p>
                                                    <p class="job__dates"><input class="ce ce--inline" bind:value={role.dates} placeholder="Jun 2020 – Present" /></p>
                                                </div>
                                                <div class="yearrow">
                                                    <label>start <input class="ce yearfield" type="number" bind:value={role.start} placeholder="2020" /></label>
                                                    <label>end <input class="ce yearfield" type="number" bind:value={role.end} placeholder="(blank = present)" /></label>
                                                    <span class="yearrow__hint">used for the timeline; leave “end” blank for present</span>
                                                </div>
                                                <ul class="job__points">
                                                    {#each role.points as pt, pi (pi)}
                                                        <li class="editable point">
                                                            <textarea class="ce" rows="1" use:autogrow bind:value={role.points[pi]} placeholder="Accomplishment…"></textarea>
                                                            <button class="iconbtn iconbtn--danger point-x" type="button" title="Remove point" on:click={() => removePoint(ji, ri, pi)}>✕</button>
                                                        </li>
                                                    {/each}
                                                </ul>
                                                <button class="add-inline" type="button" on:click={() => addPoint(ji, ri)}>＋ bullet point</button>
                                            </div>
                                        {/each}
                                    </article>
                                {/each}
                                <div class="section__add"><button class="add-inline" type="button" on:click={addJob}>＋ Add job</button></div>
                            </div>
                        </div>
                    </section>

                    <!-- ===== Education ===== -->
                    <section class="section editable">
                        <div class="tools tools--float">
                            <button class="iconbtn" type="button" title="Add education" on:click={addEdu}>＋</button>
                        </div>
                        <h2 class="section__title">Education</h2>
                        {#each education as edu, ei (ei)}
                            <article class="job editable">
                                <div class="tools tools--float">
                                    <button class="iconbtn" type="button" title="Add bullet" on:click={() => addEduPoint(ei)}>＋pt</button>
                                    <button class="iconbtn" type="button" title="Move up" on:click={() => moveEdu(ei, -1)} disabled={ei === 0}>↑</button>
                                    <button class="iconbtn" type="button" title="Move down" on:click={() => moveEdu(ei, 1)} disabled={ei === education.length - 1}>↓</button>
                                    <button class="iconbtn iconbtn--danger" type="button" title="Remove" on:click={() => removeEdu(ei)}>✕</button>
                                </div>
                                <h3 class="job__company"><input class="ce" bind:value={edu.school} placeholder="School / University" /></h3>
                                <div class="job__role">
                                    <p class="job__title"><input class="ce" bind:value={edu.credential} placeholder="Credential (e.g. B.S. in …)" /></p>
                                    <p class="job__dates"><input class="ce ce--inline" bind:value={edu.dates} placeholder="2011 – 2015" /></p>
                                </div>
                                <div class="yearrow">
                                    <label>start <input class="ce yearfield" type="number" bind:value={edu.start} placeholder="2011" /></label>
                                    <label>end <input class="ce yearfield" type="number" bind:value={edu.end} placeholder="2015" /></label>
                                </div>
                                <ul class="job__points">
                                    {#each edu.points as pt, pi (pi)}
                                        <li class="editable point">
                                            <textarea class="ce" rows="1" use:autogrow bind:value={edu.points[pi]} placeholder="Honors, coursework, GPA…"></textarea>
                                            <button class="iconbtn iconbtn--danger point-x" type="button" title="Remove point" on:click={() => removeEduPoint(ei, pi)}>✕</button>
                                        </li>
                                    {/each}
                                </ul>
                                <button class="add-inline" type="button" on:click={() => addEduPoint(ei)}>＋ bullet point</button>
                            </article>
                        {/each}
                        <div class="section__add"><button class="add-inline" type="button" on:click={addEdu}>＋ Add education</button></div>
                    </section>
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
    .editor-hint { color: var(--text-muted); margin-bottom: 1rem; font-size: 0.9rem; }

    /* ---- Real resume page look (mirrors routes/resume/+page.svelte) ---- */
    .resume { background: linear-gradient(180deg, var(--bg-mid) 0%, var(--bg-light) 100%); }
    .resume__wrap {
        max-width: var(--content-max);
        margin: 0 auto;
        padding: clamp(1.5rem, 4vh, 3rem) clamp(1rem, 4vw, 2.5rem) clamp(3rem, 8vh, 5rem);
    }
    .resume__layout { display: grid; grid-template-columns: 200px 1fr; gap: clamp(1.5rem, 4vw, 3rem); align-items: start; }

    .timeline { position: sticky; top: 1rem; display: flex; flex-direction: column; align-items: flex-start; }
    .timeline::before { content: ""; position: absolute; left: 6px; top: 1.4rem; bottom: 1.4rem; width: 3px; background: var(--accent); }
    .timeline__cap { margin: 0; padding-left: 1.6rem; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--bg-deep); }
    .timeline__cap--top { margin-bottom: 0.4rem; }
    .timeline__cap--bottom { margin-top: 0.4rem; }
    .timeline__marker { width: 15px; height: 15px; border-radius: 50%; background: var(--bg-deep); border: 3px solid var(--accent); }
    .timeline__nodes { list-style: none; display: flex; flex-direction: column; gap: clamp(1.5rem, 5vh, 3rem); padding: 1rem 0; width: 100%; }
    .node__link { display: flex; align-items: center; gap: 0.7rem; color: var(--bg-deep); font-weight: 700; line-height: 1.2; }
    .node__dot { flex: none; width: 15px; height: 15px; margin-left: -2px; border-radius: 50%; background: var(--bg-light); border: 3px solid var(--accent); }

    .section { margin-bottom: clamp(2.5rem, 6vh, 4rem); }
    .section__title { font-size: clamp(1.6rem, 4vw, 2.4rem); color: var(--text); padding-bottom: 0.4rem; margin-bottom: 1.5rem; border-bottom: 3px solid var(--accent); }
    .section__add { margin-top: 1rem; }
    .skills { display: flex; flex-direction: column; gap: 1.5rem; }
    .skills__group { background: rgba(9, 82, 86, 0.15); border-radius: var(--radius); padding: 1rem 1.25rem; }
    .skills__heading { font-size: 1.15rem; color: var(--bg-deep); padding-bottom: 0.4rem; margin-bottom: 0.75rem; border-bottom: 2px solid var(--accent); }
    .skills__list { list-style: none; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 0.4rem 1.5rem; color: var(--text); }
    .skills__item { display: flex; align-items: center; gap: 0.4rem; }
    .skills__list--tags { display: flex; flex-wrap: wrap; gap: 0.5rem 0.75rem; }
    .skills__list--tags .skills__item { background: var(--bg-deep); color: var(--text); padding: 0.3rem 0.75rem; border-radius: 999px; font-size: 0.9rem; }
    .skills__tagfield { max-width: 10ch; opacity: 0.85; }
    .skills__tag { display: inline-block; padding: 0.1rem 0.6rem; background: var(--accent); color: var(--text-on-accent); border-radius: 999px; font-size: 0.75rem; }
    .item-x, .point-x { flex-shrink: 0; width: 22px; height: 22px; font-size: 0.7rem; }
    .job { margin-bottom: 2.5rem; padding-left: 1rem; border-left: 3px solid var(--accent); }
    .job__company { font-size: 1.5rem; color: var(--text); margin-bottom: 0.75rem; }
    .role { margin-top: 1rem; }
    .job__role { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.25rem 1rem; color: var(--bg-deep); font-weight: 700; }
    .job__role p { margin: 0; flex: 1; min-width: 12ch; }
    .job__dates { text-align: right; }
    .yearrow { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin: 0.35rem 0; font-size: 0.72rem; color: var(--text-muted); font-weight: 700; }
    .yearrow label { display: inline-flex; align-items: center; gap: 0.3rem; }
    .yearfield { width: 8ch; }
    .yearrow__hint { font-weight: 400; opacity: 0.8; }
    .job__points { margin: 0.6rem 0 0; padding-left: 1.4rem; color: var(--text); display: flex; flex-direction: column; gap: 0.5rem; }
    .point { display: flex; align-items: flex-start; gap: 0.4rem; }
    .point .ce { flex: 1; }
    .tagtoggle { display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.7rem; color: #fff; font-weight: 700; }

    @media (max-width: 768px) {
        .resume__layout { grid-template-columns: 1fr; }
        .timeline { position: static; flex-direction: row; flex-wrap: wrap; }
        .timeline::before { display: none; }
    }
</style>
