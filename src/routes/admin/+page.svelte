<script>
    import { enhance } from "$app/forms";
    import { page } from "$app/stores";
    import { assetUrl } from "$lib/assets.js";

    export let data;
    export let form;

    $: base = $page.data.assetBase || "";
</script>

<svelte:head><title>Projects — Admin</title></svelte:head>

<div class="admin-wrap">
    {#if !data.hasDatabase}
        <p class="flash flash--err">
            No database is configured (DATABASE_URL unset). You can view projects, but
            creating, editing, and deleting are disabled until a database is attached.
        </p>
    {/if}
    {#if form?.deleted}
        <p class="flash flash--ok">Deleted “{form.deleted}”.</p>
    {/if}
    {#if form?.error}
        <p class="flash flash--err">{form.error}</p>
    {/if}

    <div class="admin-row">
        <h1 class="admin-title">Projects</h1>
        <a class="btn btn--solid" href="/admin/projects/new">+ New project</a>
    </div>

    {#if data.projects.length === 0}
        <p class="empty">No projects yet. Create your first one.</p>
    {:else}
        <ul class="plist">
            {#each data.projects as p (p.slug)}
                <li class="pitem">
                    <img class="pitem__thumb" src={assetUrl(p.thumb, base)} alt="" />
                    <div class="pitem__meta">
                        <p class="pitem__title">
                            {p.title}
                            {#if p.detail}<span class="pitem__badge">detail</span>
                            {:else}<span class="pitem__badge">link</span>{/if}
                        </p>
                        <p class="pitem__sub">{p.tagline}</p>
                    </div>
                    <div class="pitem__actions">
                        <a class="btn btn-sm" href={`/admin/projects/${p.slug}`}>Edit</a>
                        <form
                            method="POST"
                            action="?/delete"
                            use:enhance
                            on:submit={(e) => {
                                if (!confirm(`Delete “${p.title}”? This cannot be undone.`))
                                    e.preventDefault();
                            }}
                        >
                            <input type="hidden" name="slug" value={p.slug} />
                            <button class="btn btn-sm btn-danger" type="submit">Delete</button>
                        </form>
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
</div>
