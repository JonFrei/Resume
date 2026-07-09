<script>
    import ProjectForm from "$lib/components/admin/ProjectForm.svelte";
    export let form;
</script>

<svelte:head><title>New project — Admin</title></svelte:head>

<div class="admin-wrap admin-wrap--wide">
    <div class="admin-row">
        <h1 class="admin-title">New project</h1>
        <a class="btn btn-sm" href="/admin">← Back</a>
    </div>
    <ProjectForm mode="new" {form} />
</div>
