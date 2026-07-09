<script>
    import site from "$lib/data/site.json";
    export let heading = "Let's work together.";
</script>

<footer class="site-footer" id="contact">
    <h2 class="site-footer__heading">{heading}</h2>
    <nav class="social" aria-label="Contact links">
        {#each site.social as s}
            <a
                class="social__link"
                href={s.href}
                target={s.external ? "_blank" : undefined}
                rel={s.external ? "noopener" : undefined}
            >{s.label}</a>
        {/each}
    </nav>
</footer>
