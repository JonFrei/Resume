<script>
    import { page } from "$app/stores";
    import Nav from "$lib/components/Nav.svelte";
    import Footer from "$lib/components/Footer.svelte";
    import ProjectBlock from "$lib/components/ProjectBlock.svelte";
    import { assetUrl } from "$lib/assets.js";

    export let data;
    $: base = $page.data.assetBase || "";
    $: project = data.project;
    $: codeUrl = project.code_url || project.codeUrl;
</script>

<svelte:head>
    <title>{project.title} — Jonathan Freier</title>
    <meta name="description" content={project.hero?.lead?.slice(0, 155) || project.title} />
</svelte:head>

<Nav />

<main class="page project-detail">
    <article class="project-detail__inner">
        <a class="project-detail__back" href="/projects/">← All projects</a>

        <header class="project-hero">
            <h1 class="project-hero__title">{project.title}</h1>
            <p class="project-hero__tagline">{project.tagline}</p>
            {#if project.hero?.lead}
                <p class="project-hero__lead">{project.hero.lead}</p>
            {/if}

            {#if project.hero?.gallery?.length}
                <div class="project-hero__gallery">
                    {#each project.hero.gallery as g}
                        <img src={assetUrl(g.src, base)} alt={g.alt || ""} />
                    {/each}
                </div>
            {/if}
        </header>

        {#each project.blocks || [] as block}
            <ProjectBlock {block} {base} />
        {/each}

        {#if codeUrl}
            <div class="project-detail__code">
                <a class="btn btn--solid" href={codeUrl} target="_blank" rel="noopener">
                    Get code on GitHub
                </a>
            </div>
        {/if}
    </article>
</main>

<Footer heading="Let's chat." />

<style>
    .project-detail {
        background: linear-gradient(180deg, var(--bg-page-start) 0%, var(--bg-page-end) 100%);
        min-height: 100vh;
        padding-top: var(--nav-height);
    }
    .project-detail__inner {
        max-width: var(--content-max);
        margin: 0 auto;
        padding: clamp(2rem, 6vh, 4rem) clamp(1.25rem, 4vw, 2.5rem) clamp(3rem, 8vh, 5rem);
    }
    .project-detail__back {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        margin-bottom: 1.5rem;
        color: var(--bg-deep);
        font-weight: 700;
        transition: color var(--speed) var(--ease);
    }
    .project-detail__back:hover {
        color: var(--accent-dark);
    }
    .project-hero__title {
        font-size: clamp(2rem, 6vw, 3.5rem);
        color: var(--text);
    }
    .project-hero__tagline {
        margin: 0.75rem 0 1.5rem;
        color: var(--bg-deep);
        font-weight: 700;
        font-size: clamp(1rem, 2.5vw, 1.25rem);
    }
    .project-hero__lead {
        color: var(--text);
        font-size: 1.05rem;
        max-width: 70ch;
    }
    .project-hero__gallery {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin: 1.5rem 0;
    }
    .project-hero__gallery img {
        width: 100%;
        aspect-ratio: 4 / 3;
        object-fit: cover;
        border: 2px solid var(--accent);
        border-radius: var(--radius);
    }
    .project-detail__code {
        display: flex;
        justify-content: center;
        margin-top: clamp(2rem, 6vh, 3rem);
    }
</style>
