<script>
    import ProjectForm from "$lib/components/admin/ProjectForm.svelte";
    export let form;
</script>

<svelte:head><title>New project — Admin</title></svelte:head>

<div class="admin-wrap">
    <h1 class="admin-title">New project</h1>
    <ProjectForm mode="new" {form} />
</div>
