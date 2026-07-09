<script>
    import ProjectForm from "$lib/components/admin/ProjectForm.svelte";
    export let data;
    export let form;
</script>

<svelte:head><title>Edit {data.project.title} — Admin</title></svelte:head>

<div class="admin-wrap">
    <h1 class="admin-title">Edit: {data.project.title}</h1>
    <ProjectForm mode="edit" project={data.project} {form} />
</div>
