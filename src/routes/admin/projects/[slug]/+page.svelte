<script>
    import ProjectForm from "$lib/components/admin/ProjectForm.svelte";
    export let data;
    export let form;
</script>

<svelte:head><title>Edit {data.project.title} — Admin</title></svelte:head>

<div class="admin-wrap admin-wrap--wide">
    <div class="admin-row">
        <h1 class="admin-title">Edit: {data.project.title}</h1>
        <a class="btn btn-sm" href="/admin">← Back</a>
    </div>
    <ProjectForm mode="edit" project={data.project} {form} />
</div>
