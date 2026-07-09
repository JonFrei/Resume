<script>
    import { page } from "$app/stores";
    import "$lib/styles/admin.css";

    $: showChrome = $page.url.pathname !== "/admin/login";
</script>

{#if showChrome}
    <header class="admin-header">
        <a class="admin-header__brand" href="/admin">Portfolio Admin</a>
        <nav class="admin-header__nav">
            <a href="/admin" class:active={$page.url.pathname === "/admin" || $page.url.pathname.startsWith("/admin/projects")}>Projects</a>
            <a href="/admin/resume" class:active={$page.url.pathname.startsWith("/admin/resume")}>Resume</a>
            <a href="/admin/theme" class:active={$page.url.pathname.startsWith("/admin/theme")}>Theme</a>
            <a href="/" target="_blank" rel="noopener">View site ↗</a>
            <form method="POST" action="/admin/logout">
                <button class="admin-header__logout" type="submit">Log out</button>
            </form>
        </nav>
    </header>
{/if}

<div class="admin-main">
    <slot />
</div>
