<script>
    import { page } from "$app/stores";
    import site from "$lib/data/site.json";

    let open = false;
    const close = () => (open = false);

    // A nav item is "current" when its href matches the start of the path.
    // "/" only matches exactly; hash links (#contact) never mark current.
    function isCurrent(href, path) {
        if (href.startsWith("#")) return false;
        if (href === "/") return path === "/";
        return path === href || path.startsWith(href);
    }

    $: path = $page.url.pathname;

    function onKeydown(e) {
        if (e.key === "Escape") close();
    }
</script>

<svelte:window on:keydown={onKeydown} />

<header class="site-header">
    <nav class="nav" aria-label="Primary">
        <a class="nav__brand" href="/">{site.brand}</a>

        <ul class="nav__menu" class:is-open={open} id="nav-menu">
            {#each site.nav as item}
                <li>
                    <a
                        class="nav__link"
                        href={item.href}
                        aria-current={isCurrent(item.href, path) ? "page" : undefined}
                        on:click={close}
                    >{item.label}</a>
                </li>
            {/each}
        </ul>

        <button
            class="nav__toggle"
            class:is-open={open}
            type="button"
            aria-label="Toggle navigation menu"
            aria-controls="nav-menu"
            aria-expanded={open}
            on:click={() => (open = !open)}
        >
            <span class="bar"></span>
            <span class="bar"></span>
            <span class="bar"></span>
        </button>
    </nav>
</header>
