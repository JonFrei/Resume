<script>
    import { enhance } from "$app/forms";

    export let data;
    export let form;

    // --- Local editable state, deep-copied from the loaded resume. ---
    // Skills groups. Items are edited as a textarea (one per line); an item may
    // be "Text" or "Text | Tag" (pipe splits the tag), matching the two shapes
    // the renderer supports (string vs { text, tag }).
    function itemToLine(it) {
        if (it && typeof it === "object") return it.tag ? `${it.text} | ${it.tag}` : it.text;
        return String(it);
    }
    let skills = (data.resume.skills || []).map((g) => ({
        heading: g.heading || "",
        tags: g.style === "tags",
        items: (g.items || []).map(itemToLine).join("\n"),
    }));

    let experience = (data.resume.experience || []).map((j) => ({
        id: j.id || "",
        company: j.company || "",
        roles: (j.roles || []).map((r) => ({
            title: r.title || "",
            dates: r.dates || "",
            points: (r.points || []).join("\n"),
        })),
    }));

    // --- Skills helpers ---
    const addSkillGroup = () => (skills = [...skills, { heading: "", tags: false, items: "" }]);
    const removeSkillGroup = (i) => (skills = skills.filter((_, idx) => idx !== i));
    const moveSkillGroup = (i, dir) => (skills = move(skills, i, dir));

    // --- Experience helpers ---
    const newRole = () => ({ title: "", dates: "", points: "" });
    const addJob = () =>
        (experience = [...experience, { id: "", company: "", roles: [newRole()] }]);
    const removeJob = (i) => (experience = experience.filter((_, idx) => idx !== i));
    const moveJob = (i, dir) => (experience = move(experience, i, dir));

    const addRole = (ji) => {
        experience[ji].roles = [...experience[ji].roles, newRole()];
        experience = experience;
    };
    const removeRole = (ji, ri) => {
        experience[ji].roles = experience[ji].roles.filter((_, idx) => idx !== ri);
        experience = experience;
    };
    const moveRole = (ji, ri, dir) => {
        experience[ji].roles = move(experience[ji].roles, ri, dir);
        experience = experience;
    };

    function move(arr, i, dir) {
        const j = i + dir;
        if (j < 0 || j >= arr.length) return arr;
        const copy = arr.slice();
        [copy[i], copy[j]] = [copy[j], copy[i]];
        return copy;
    }

    // --- Build the payload the server parser expects ---
    function lineToItem(line) {
        const parts = line.split("|");
        const text = parts[0].trim();
        const tag = (parts[1] || "").trim();
        return tag ? { text, tag } : text;
    }
    $: payload = JSON.stringify({
        skills: skills.map((g) => ({
            heading: g.heading,
            style: g.tags ? "tags" : undefined,
            items: g.items.split("\n").map((l) => l.trim()).filter(Boolean).map(lineToItem),
        })),
        experience: experience.map((j) => ({
            id: j.id,
            company: j.company,
            roles: j.roles.map((r) => ({
                title: r.title,
                dates: r.dates,
                points: r.points, // server splits on newlines
            })),
        })),
    });

    let saving = false;
    const submit = () => {
        saving = true;
        return async ({ update }) => {
            await update({ reset: false });
            saving = false;
        };
    };
</script>

<svelte:head><title>Resume — Admin</title></svelte:head>

<div class="admin-wrap">
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
    {#if form?.saved}
        <p class="flash flash--ok">Resume saved.</p>
    {/if}
    {#if form?.error}
        <p class="flash flash--err">{form.error}</p>
    {/if}

    <form class="form" method="POST" use:enhance={submit}>
        <input type="hidden" name="payload" value={payload} />

        <!-- ===================== Skills ===================== -->
        <section>
            <div class="sec-head">
                <h2 class="sec-title">Skills</h2>
                <button class="btn btn-sm" type="button" on:click={addSkillGroup}>+ Add group</button>
            </div>

            {#each skills as g, i (i)}
                <div class="block-card">
                    <div class="block-card__head">
                        <strong>Group {i + 1}</strong>
                        <span class="card-tools">
                            <button class="btn btn-sm" type="button" on:click={() => moveSkillGroup(i, -1)} disabled={i === 0}>↑</button>
                            <button class="btn btn-sm" type="button" on:click={() => moveSkillGroup(i, 1)} disabled={i === skills.length - 1}>↓</button>
                            <button class="btn btn-sm btn-danger" type="button" on:click={() => removeSkillGroup(i)}>Remove</button>
                        </span>
                    </div>
                    <div class="field">
                        <label>Heading</label>
                        <input class="input" bind:value={g.heading} placeholder="e.g. Programming Languages" />
                    </div>
                    <label class="checkbox">
                        <input type="checkbox" bind:checked={g.tags} />
                        Display items as tag pills
                    </label>
                    <div class="field">
                        <label>Items (one per line)</label>
                        <textarea class="textarea" bind:value={g.items} rows="5"
                            placeholder={"JavaScript\nPython\nEnglish | Primary"}></textarea>
                        <span class="hint">
                            Add a tag with a pipe: <code>English | Primary</code>.
                        </span>
                    </div>
                </div>
            {/each}
        </section>

        <!-- =================== Experience =================== -->
        <section>
            <div class="sec-head">
                <h2 class="sec-title">Professional Experience</h2>
                <button class="btn btn-sm" type="button" on:click={addJob}>+ Add job</button>
            </div>

            {#each experience as j, ji (ji)}
                <div class="block-card">
                    <div class="block-card__head">
                        <strong>{j.company || `Job ${ji + 1}`}</strong>
                        <span class="card-tools">
                            <button class="btn btn-sm" type="button" on:click={() => moveJob(ji, -1)} disabled={ji === 0}>↑</button>
                            <button class="btn btn-sm" type="button" on:click={() => moveJob(ji, 1)} disabled={ji === experience.length - 1}>↓</button>
                            <button class="btn btn-sm btn-danger" type="button" on:click={() => removeJob(ji)}>Remove</button>
                        </span>
                    </div>
                    <div class="row-2">
                        <div class="field">
                            <label>Company</label>
                            <input class="input" bind:value={j.company} placeholder="Company name" />
                        </div>
                        <div class="field">
                            <label>Anchor id</label>
                            <input class="input" bind:value={j.id} placeholder="auto from company" />
                            <span class="hint">Used for the in-page jump link. Leave blank to auto-generate.</span>
                        </div>
                    </div>

                    <div class="roles">
                        {#each j.roles as r, ri (ri)}
                            <div class="role-card">
                                <div class="block-card__head">
                                    <strong>Role {ri + 1}</strong>
                                    <span class="card-tools">
                                        <button class="btn btn-sm" type="button" on:click={() => moveRole(ji, ri, -1)} disabled={ri === 0}>↑</button>
                                        <button class="btn btn-sm" type="button" on:click={() => moveRole(ji, ri, 1)} disabled={ri === j.roles.length - 1}>↓</button>
                                        <button class="btn btn-sm btn-danger" type="button" on:click={() => removeRole(ji, ri)}>Remove</button>
                                    </span>
                                </div>
                                <div class="row-2">
                                    <div class="field">
                                        <label>Title</label>
                                        <input class="input" bind:value={r.title} placeholder="Job title" />
                                    </div>
                                    <div class="field">
                                        <label>Dates</label>
                                        <input class="input" bind:value={r.dates} placeholder="Jan 2020 – Present" />
                                    </div>
                                </div>
                                <div class="field">
                                    <label>Bullet points (one per line)</label>
                                    <textarea class="textarea" bind:value={r.points} rows="6"></textarea>
                                </div>
                            </div>
                        {/each}
                        <button class="btn btn-sm" type="button" on:click={() => addRole(ji)}>+ Add role</button>
                    </div>
                </div>
            {/each}
        </section>

        <div class="actions-bar">
            <button class="btn btn--solid" type="submit" disabled={saving || !data.hasDatabase}>
                {saving ? "Saving…" : "Save resume"}
            </button>
            <a class="btn btn-sm" href="/resume/" target="_blank" rel="noopener">Preview site ↗</a>
        </div>
    </form>
</div>

<style>
    .sec-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin: 1.5rem 0 0.75rem;
    }
    .sec-title {
        font-size: 1.3rem;
        color: var(--text);
    }
    .card-tools {
        display: flex;
        gap: 0.4rem;
        flex-shrink: 0;
    }
    .roles {
        margin-top: 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
    .role-card {
        border: 1px solid var(--accent);
        border-radius: var(--radius);
        padding: 0.85rem;
        background: rgba(0, 0, 0, 0.15);
    }
    code {
        background: rgba(0, 0, 0, 0.25);
        padding: 0.05rem 0.3rem;
        border-radius: 3px;
    }
</style>
