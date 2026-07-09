<script>
    import { onMount } from "svelte";
    import Nav from "$lib/components/Nav.svelte";
    import Footer from "$lib/components/Footer.svelte";

    export let data;
    $: resume = data.resume;

    // The timeline spine runs Present (top) → past (bottom), mirroring the
    // original "Professional Experience" page. End labels are presentational.
    const timelineStart = "Present";
    const timelineEnd = "1993";

    // Node currently in view — lit up on the spine as the reader scrolls.
    let activeId = "";
    $: if (!activeId && resume?.experience?.length) activeId = resume.experience[0].id;

    onMount(() => {
        const sections = resume.experience
            .map((job) => document.getElementById(job.id))
            .filter(Boolean);
        if (!sections.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) activeId = entry.target.id;
                }
            },
            // Trip when a section reaches the upper third of the viewport.
            { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
        );
        sections.forEach((s) => observer.observe(s));
        return () => observer.disconnect();
    });
</script>

<svelte:head>
    <title>Resume — Jonathan Freier</title>
    <meta name="description" content="Resume of Jonathan Freier — Controls Engineer. Skills, certifications, and professional experience." />
</svelte:head>

<Nav />

<main class="page resume">
    <div class="resume__wrap">
        <section id="skills" class="section">
            <h2 class="section__title">Skills</h2>
            <div class="skills">
                {#each resume.skills as group}
                    <div class="skills__group">
                        <h3 class="skills__heading">{group.heading}</h3>
                        <ul class="skills__list" class:skills__list--tags={group.style === "tags"}>
                            {#each group.items as item}
                                {#if typeof item === "string"}
                                    <li>{item}</li>
                                {:else}
                                    <li>{item.text} <span class="skills__tag">{item.tag}</span></li>
                                {/if}
                            {/each}
                        </ul>
                    </div>
                {/each}
            </div>
        </section>

        <section class="section">
            <h2 class="section__title">Professional Experience</h2>

            <div class="resume__layout">
                <!-- Timeline spine: Present → past, each job a node branching off. -->
                <nav class="timeline" aria-label="Experience timeline">
                    <p class="timeline__cap timeline__cap--top">{timelineStart}</p>
                    <span class="timeline__marker timeline__marker--top" aria-hidden="true"></span>
                    <span class="timeline__spine" aria-hidden="true"></span>
                    <ul class="timeline__nodes">
                        {#each resume.experience as job}
                            <li class="node" class:node--active={activeId === job.id}>
                                <a class="node__link" href={`#${job.id}`} aria-current={activeId === job.id ? "true" : undefined}>
                                    <span class="node__dot" aria-hidden="true"></span>
                                    <span class="node__label">{job.company}</span>
                                </a>
                            </li>
                        {/each}
                    </ul>
                    <span class="timeline__marker timeline__marker--bottom" aria-hidden="true"></span>
                    <p class="timeline__cap timeline__cap--bottom">{timelineEnd}</p>
                </nav>

                <div class="resume__content">
                    {#each resume.experience as job}
                        <article id={job.id} class="job" class:job--active={activeId === job.id}>
                            <h3 class="job__company">{job.company}</h3>
                            {#each job.roles as role}
                                <div class="job__role">
                                    <p class="job__title">{role.title}</p>
                                    <p class="job__dates">{role.dates}</p>
                                </div>
                                <ul class="job__points">
                                    {#each role.points as pt}<li>{pt}</li>{/each}
                                </ul>
                            {/each}
                        </article>
                    {/each}
                </div>
            </div>
        </section>
    </div>
</main>

<Footer heading="How would you like to connect?" />

<style>
    .resume {
        background: linear-gradient(180deg, var(--bg-mid) 0%, var(--bg-light) 100%);
        min-height: 100vh;
        padding-top: var(--nav-height);
    }
    .resume__layout {
        max-width: var(--content-max);
        margin: 0 auto;
        padding: clamp(1.5rem, 4vh, 3rem) clamp(1rem, 4vw, 2.5rem) clamp(3rem, 8vh, 5rem);
        display: grid;
        grid-template-columns: 200px 1fr;
        gap: clamp(1.5rem, 4vw, 3rem);
        align-items: start;
    }
    .resume__nav {
        position: sticky;
        top: calc(var(--nav-height) + 1.5rem);
    }
    .jump {
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        border-left: 3px solid var(--accent);
    }
    .jump__link {
        display: block;
        padding: 0.55rem 1rem;
        color: var(--bg-deep);
        font-weight: 700;
        transition: background var(--speed) var(--ease), color var(--speed) var(--ease);
    }
    .jump__link:hover,
    .jump__link:focus-visible {
        background: var(--bg-deep);
        color: var(--text);
    }
    .section {
        margin-bottom: clamp(2.5rem, 6vh, 4rem);
    }
    .section__title {
        font-size: clamp(1.6rem, 4vw, 2.4rem);
        color: var(--text);
        padding-bottom: 0.4rem;
        margin-bottom: 1.5rem;
        border-bottom: 3px solid var(--accent);
    }
    .skills {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }
    .skills__group {
        background: rgba(9, 82, 86, 0.15);
        border-radius: var(--radius);
        padding: 1rem 1.25rem;
    }
    .skills__heading {
        font-size: 1.15rem;
        color: var(--bg-deep);
        padding-bottom: 0.4rem;
        margin-bottom: 0.75rem;
        border-bottom: 2px solid var(--accent);
    }
    .skills__list {
        list-style: none;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 0.4rem 1.5rem;
        color: var(--text);
    }
    .skills__list--tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem 0.75rem;
    }
    .skills__list--tags li {
        background: var(--bg-deep);
        color: var(--text);
        padding: 0.3rem 0.75rem;
        border-radius: 999px;
        font-size: 0.9rem;
    }
    .skills__tag {
        display: inline-block;
        margin-left: 0.5rem;
        padding: 0.1rem 0.6rem;
        background: var(--accent);
        color: var(--text-on-accent);
        border-radius: 999px;
        font-size: 0.75rem;
    }
    .job {
        margin-bottom: 2.5rem;
        scroll-margin-top: calc(var(--nav-height) + 1rem);
    }
    .job__company {
        font-size: 1.5rem;
        color: var(--text);
        margin-bottom: 0.75rem;
    }
    .job__role {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 0.25rem 1rem;
        margin-top: 1rem;
        color: var(--bg-deep);
        font-weight: 700;
    }
    .job__role p {
        margin: 0;
    }
    .job__points {
        margin: 0.6rem 0 0;
        padding-left: 1.4rem;
        color: var(--text);
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    @media (max-width: 768px) {
        .resume__layout {
            grid-template-columns: 1fr;
        }
        .resume__nav {
            position: static;
        }
        .jump {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 0.5rem;
            border-left: none;
        }
        .jump__link {
            border: 2px solid var(--accent);
            border-radius: var(--radius);
            padding: 0.4rem 0.8rem;
            font-size: 0.9rem;
        }
    }
</style>
