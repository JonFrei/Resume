<script>
    import { page } from "$app/stores";
    import Nav from "$lib/components/Nav.svelte";
    import Footer from "$lib/components/Footer.svelte";
    import site from "$lib/data/site.json";
    import { assetUrl } from "$lib/assets.js";

    $: base = $page.data.assetBase || "";
    const hero = site.hero;
</script>

<svelte:head>
    <title>Jonathan Freier — Portfolio</title>
    <meta name="description" content="Jonathan Freier — Controls Engineer & developer. Projects, resume, and contact." />
</svelte:head>

<Nav />

<main class="page home">
    <section class="hero">
        <h1 class="hero__title">{hero.name}</h1>
        <p class="hero__subtitle">{hero.subtitle}</p>

        <div class="hero__links">
            {#each hero.links as link}
                <a
                    class="hero__link"
                    href={link.href}
                    aria-label={link.label}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener" : undefined}
                >
                    <img src={assetUrl(link.img, base)} alt={link.label} />
                </a>
            {/each}
        </div>

        <div class="hero__cta">
            <a class="btn btn--solid" href="/projects/">View Projects</a>
            <a class="btn" href="/resume/">View Resume</a>
        </div>
    </section>
</main>

<Footer />

<style>
    .home {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding-top: var(--nav-height);
        background: linear-gradient(160deg, var(--bg-page-start) 0%, var(--bg-page-end) 100%);
    }

    .hero {
        width: 100%;
        max-width: var(--content-max);
        margin: 0 auto;
        padding: clamp(2rem, 8vh, 5rem) clamp(1.25rem, 5vw, 3rem);
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 1.5rem;
    }

    .hero__title {
        font-size: var(--fs-display);
        color: var(--text);
        letter-spacing: -0.01em;
        text-shadow: 0 2px 12px rgba(9, 82, 86, 0.5);
    }

    .hero__subtitle {
        margin: 0;
        font-family: var(--font-mono);
        font-size: var(--fs-lead);
        color: var(--text-secondary);
        font-weight: 500;
        letter-spacing: 0.02em;
    }

    .hero__links {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: clamp(1.5rem, 6vw, 3.5rem);
        margin-top: 0.5rem;
    }

    .hero__link {
        display: flex;
        align-items: center;
        justify-content: center;
        width: clamp(64px, 14vw, 110px);
        aspect-ratio: 1;
        transition: transform var(--speed) var(--ease);
    }

    .hero__link:hover,
    .hero__link:focus-visible {
        transform: translateY(-6px) scale(1.05);
    }

    .hero__link img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }

    .hero__cta {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 1rem;
        margin-top: 1rem;
    }
</style>
