<script>
    import { page } from "$app/stores";
    import Nav from "$lib/components/Nav.svelte";
    import Footer from "$lib/components/Footer.svelte";
    import { assetUrl } from "$lib/assets.js";

    export let data;
    $: base = $page.data.assetBase || "";

    // A card links to its detail page, or to an external URL.
    function href(p) {
        if (p.detail) return `/projects/${p.slug}/`;
        return p.url || "#";
    }
    const isExternal = (p) => !p.detail && !!p.url;
</script>

<svelte:head>
    <title>Projects — Jonathan Freier</title>
    <meta name="description" content="Projects by Jonathan Freier — robotics, controls, and web applications." />
</svelte:head>

<Nav />

<main class="page projects">
    <header class="projects__intro">
        <h1 class="projects__title">Projects</h1>
        <p class="projects__lead">A selection of robotics, controls, and web work.</p>
    </header>

    <section class="project-grid" aria-label="Project list">
        {#each data.projects as p (p.slug)}
            <a
                class="project-card"
                href={href(p)}
                target={isExternal(p) ? "_blank" : undefined}
                rel={isExternal(p) ? "noopener" : undefined}
            >
                <img class="project-card__img" src={assetUrl(p.thumb, base)} alt={p.title} />
                <div class="project-card__body">
                    <h2 class="project-card__title">{p.title}</h2>
                    <p class="project-card__tags">{p.tagline}</p>
                </div>
            </a>
        {/each}
    </section>
</main>

<Footer heading="Let's work together." />

<style>
    .projects {
        background: linear-gradient(180deg, var(--bg-deep) 0%, var(--jungle-green) 100%);
        min-height: 100vh;
        padding-top: var(--nav-height);
    }

    .projects__intro {
        text-align: center;
        padding: clamp(2rem, 6vh, 4rem) 1.25rem 0;
        color: var(--text);
    }

    .projects__title {
        font-size: clamp(2rem, 7vw, 3.5rem);
    }

    .projects__lead {
        margin: 0.75rem 0 0;
        color: var(--text-muted);
        font-size: clamp(0.95rem, 2.5vw, 1.15rem);
    }

    .project-grid {
        max-width: var(--content-max);
        margin: 0 auto;
        padding: clamp(2rem, 5vh, 3.5rem) clamp(1.25rem, 4vw, 2.5rem) clamp(3rem, 8vh, 5rem);
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: clamp(1.5rem, 3vw, 2.5rem);
    }

    .project-card {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background: var(--surface);
        border: 2px solid var(--accent);
        border-radius: var(--radius);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
        transition: transform var(--speed) var(--ease), box-shadow var(--speed) var(--ease);
    }

    .project-card:hover,
    .project-card:focus-visible {
        transform: translateY(-6px);
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.5);
    }

    .project-card__img {
        width: 100%;
        aspect-ratio: 4 / 3;
        object-fit: cover;
        background: var(--jungle-green);
    }

    .project-card__body {
        padding: 1rem 1.25rem 1.25rem;
        text-align: center;
        background: var(--accent);
        color: var(--text-on-accent);
    }

    .project-card__title {
        font-size: 1.25rem;
    }

    .project-card__tags {
        margin: 0.4rem 0 0;
        font-size: 0.9rem;
        color: var(--jungle-green);
        font-weight: 700;
    }
</style>
