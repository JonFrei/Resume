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

    // Scroll to a same-page fragment (e.g. #contact) ourselves instead of letting
    // the anchor's default hash navigation run.
    //
    // Why: on /resume the footer (#contact) lives INSIDE a nested overflow:auto
    // pane (.resume__content), while the page root is height:100vh; overflow:hidden.
    // The document itself can't scroll to reach it, so SvelteKit's hash-nav scroll
    // handling never settles — it thrashes history (popstate/replaceState) and the
    // router stops processing further navigations. The page appears frozen with no
    // console error. Scrolling the element into view directly (which walks up to
    // whichever ancestor actually scrolls) sidesteps the router entirely.
    function onNavClick(e, href) {
        if (!href.startsWith("#")) {
            close();
            return;
        }
        e.preventDefault();
        close();
        const id = href.slice(1);
        const el = document.getElementById(id);
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "start" });
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
                        on:click={(e) => onNavClick(e, item.href)}
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
