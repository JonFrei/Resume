<script>
    import { onMount } from "svelte";
    import Nav from "$lib/components/Nav.svelte";
    import Footer from "$lib/components/Footer.svelte";

    export let data;
    $: resume = data.resume;

    // ---- Build one chronologically-sorted timeline from experience + education.
    // Each experience ROLE becomes its own node (a person can hold two roles at
    // one company); each education entry is a node. Nodes are merged and sorted
    // newest → oldest so the spine reads Present (top) → past (bottom), with
    // experience and schooling interleaved by date. A null `end` means "Present".
    const PRESENT = 9999; // sorts an open-ended (current) entry to the very top

    $: nodes = buildNodes(resume);

    function buildNodes(r) {
        const out = [];
        for (const job of r?.experience ?? []) {
            for (const [i, role] of (job.roles ?? []).entries()) {
                out.push({
                    // One stable id per role; the content block uses the same id.
                    id: (job.roles.length > 1 ? `${job.id}-${i}` : job.id),
                    jobId: job.id,
                    kind: "experience",
                    title: job.company,
                    subtitle: role.title,
                    dates: role.dates,
                    start: role.start ?? null,
                    end: role.end ?? null,
                    points: role.points ?? [],
                });
            }
        }
        for (const edu of r?.education ?? []) {
            out.push({
                id: edu.id,
                jobId: edu.id,
                kind: "education",
                title: edu.school,
                subtitle: edu.credential,
                dates: edu.dates,
                start: edu.start ?? null,
                end: edu.end ?? null,
                points: edu.points ?? [],
            });
        }
        // Sort newest first: by end year (null end = Present = top), then start.
        out.sort((a, b) => {
            const ae = a.end == null ? PRESENT : a.end;
            const be = b.end == null ? PRESENT : b.end;
            if (be !== ae) return be - ae;
            return (b.start ?? 0) - (a.start ?? 0);
        });
        // Assign the branch side by position: alternate left / right down the spine.
        return out.map((n, i) => ({ ...n, side: i % 2 === 0 ? "right" : "left" }));
    }

    // Present/past end-cap labels for the spine.
    const capTop = "Present";
    $: capBottom = smallestYear(nodes);
    function smallestYear(list) {
        const years = list
            .flatMap((n) => [n.start, n.end])
            .filter((y) => typeof y === "number");
        return years.length ? String(Math.min(...years)) : "";
    }

    // ---- Scroll-spy: highlight the node whose content block is in view.
    let activeId = "";
    let contentPane; // the scrollable right pane (bound in markup)
    $: if (!activeId && nodes.length) activeId = nodes[0].id;

    onMount(() => {
        const sections = nodes
            .map((n) => document.getElementById(n.id))
            .filter(Boolean);
        if (!sections.length) return;

        // On desktop the content scrolls inside `contentPane`, so the observer
        // must use it as its root; on mobile the pane isn't a scroll container
        // and `null` (viewport) is correct. A wide viewport ⇒ pane root.
        const usesPane = typeof window !== "undefined" && window.innerWidth > 820;
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) activeId = entry.target.id;
                }
            },
            {
                root: usesPane ? contentPane : null,
                rootMargin: "-25% 0px -60% 0px",
                threshold: 0,
            }
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
    <div class="resume__split">
        <!-- ========================= LEFT: TIMELINE NAV ========================= -->
        <nav class="tl" aria-label="Resume timeline">
            <div class="tl__inner">
                <a class="tl__skills" href="#skills">
                    Skills <span aria-hidden="true">↥</span>
                </a>

                <div class="tl__track">
                    <p class="tl__cap tl__cap--top">{capTop}</p>
                    <span class="tl__marker" aria-hidden="true"></span>

                    <ol class="tl__nodes">
                        {#each nodes as n (n.id)}
                            <li class="tlnode tlnode--{n.side} tlnode--{n.kind}" class:tlnode--active={activeId === n.id}>
                                <a
                                    class="tlnode__card"
                                    href={`#${n.id}`}
                                    aria-current={activeId === n.id ? "true" : undefined}
                                >
                                    <span class="tlnode__kind">{n.kind === "education" ? "Education" : "Experience"}</span>
                                    <span class="tlnode__title">{n.title}</span>
                                    {#if n.subtitle}<span class="tlnode__sub">{n.subtitle}</span>{/if}
                                    {#if n.dates}<span class="tlnode__dates">{n.dates}</span>{/if}
                                </a>
                            </li>
                        {/each}
                    </ol>

                    <span class="tl__marker" aria-hidden="true"></span>
                    {#if capBottom}<p class="tl__cap tl__cap--bottom">{capBottom}</p>{/if}
                </div>
            </div>
        </nav>

        <!-- ========================= RIGHT: RESUME CONTENT ========================= -->
        <div class="resume__content" bind:this={contentPane}>
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
                <h2 class="section__title">Experience &amp; Education</h2>
                {#each nodes as n (n.id)}
                    <article
                        id={n.id}
                        class="entry entry--{n.kind}"
                        class:entry--active={activeId === n.id}
                    >
                        <div class="entry__head">
                            <span class="entry__badge">{n.kind === "education" ? "Education" : "Experience"}</span>
                            <h3 class="entry__title">{n.title}</h3>
                        </div>
                        <div class="entry__meta">
                            {#if n.subtitle}<p class="entry__sub">{n.subtitle}</p>{/if}
                            {#if n.dates}<p class="entry__dates">{n.dates}</p>{/if}
                        </div>
                        {#if n.points.length}
                            <ul class="entry__points">
                                {#each n.points as pt}<li>{pt}</li>{/each}
                            </ul>
                        {/if}
                    </article>
                {/each}
            </section>

            <!-- Footer scrolls at the bottom of the content pane, not the page. -->
            <Footer heading="How would you like to connect?" />
        </div>
    </div>
</main>

<style>
    /* The page fills the viewport below the fixed nav and does NOT scroll
       itself — each pane (timeline / content) scrolls independently. */
    .resume {
        background: linear-gradient(180deg, var(--bg-page-start) 0%, var(--bg-page-end) 100%);
        height: 100vh;
        padding-top: var(--nav-height);
        overflow: hidden;
    }
    /* The page split in two: timeline nav | resume content.
       Fills the remaining viewport height; each column scrolls on its own. */
    .resume__split {
        width: 100%;
        height: calc(100vh - var(--nav-height));
        margin: 0;
        padding: 0 clamp(1rem, 4vw, 3rem);
        display: grid;
        /* Slightly narrower than the original 300–360px timeline column; the
           cards branch out to each side (see .tlnode__card), so this needs to
           fit two half-width cards on the spine. */
        grid-template-columns: minmax(280px, 320px) 1fr;
        gap: clamp(1rem, 3vw, 2.5rem);
        align-items: stretch;
        min-height: 0; /* allow children to shrink + scroll */
    }

    /* ===================== TIMELINE NAV ===================== */
    /* Full-height pane with its own scroll. */
    .tl {
        height: 100%;
        min-height: 0;
        overflow-y: auto;
        padding: clamp(1rem, 3vh, 2rem) 0.5rem clamp(2rem, 5vh, 3rem);
        border-right: 1px solid rgba(255, 255, 255, 0.12);
        /* Discrete, theme-tinted scrollbar (Firefox). */
        scrollbar-width: thin;
        scrollbar-color: var(--accent) transparent;
    }
    /* Right pane: resume content + footer scroll together, independently of
       the timeline. */
    .resume__content {
        height: 100%;
        min-height: 0;
        overflow-y: auto;
        padding: clamp(1rem, 3vh, 2rem) 0 0;
        scroll-behavior: smooth;
        scrollbar-width: thin;
        scrollbar-color: var(--accent) transparent;
    }
    .resume__content::-webkit-scrollbar {
        width: 6px;
    }
    .resume__content::-webkit-scrollbar-track {
        background: transparent;
    }
    .resume__content::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, var(--accent) 0%, var(--accent-dark) 100%);
        border-radius: 999px;
    }
    .resume__content::-webkit-scrollbar-thumb:hover {
        background: var(--accent-dark);
    }
    /* Discrete, theme-tinted scrollbar (WebKit/Chromium). */
    .tl::-webkit-scrollbar {
        width: 6px;
    }
    .tl::-webkit-scrollbar-track {
        background: transparent;
    }
    .tl::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, var(--accent) 0%, var(--accent-dark) 100%);
        border-radius: 999px;
    }
    .tl::-webkit-scrollbar-thumb:hover {
        background: var(--accent-dark);
    }
    .tl__inner {
        min-height: 100%;
    }
    .tl__skills {
        display: block;
        width: calc(100% - 1rem);
        margin: 0 auto 1.25rem;
        text-align: center;
        background: linear-gradient(180deg, var(--accent) 0%, var(--accent-dark) 130%);
        color: var(--text-on-accent);
        font-family: var(--font-mono);
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        font-size: 0.9rem;
        padding: 0.7rem 1rem;
        border-radius: var(--radius);
        box-shadow: 0 6px 16px -8px rgba(0, 0, 0, 0.6);
        transition: transform var(--speed) var(--ease), box-shadow var(--speed) var(--ease);
    }
    .tl__skills:hover,
    .tl__skills:focus-visible {
        transform: translateY(-1px);
        box-shadow: 0 10px 22px -8px rgba(0, 0, 0, 0.7);
    }

    /* The central branch runs down the middle of the track. */
    .tl__track {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .tl__track::before {
        content: "";
        position: absolute;
        top: 0;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 3px;
        background: linear-gradient(
            180deg,
            var(--accent) 0%,
            rgba(255, 255, 255, 0.35) 8%,
            rgba(255, 255, 255, 0.35) 92%,
            var(--accent-dark) 100%
        );
        border-radius: 3px;
    }
    .tl__cap {
        position: relative;
        margin: 0;
        font-family: var(--font-mono);
        font-size: var(--fs-label);
        font-weight: 700;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--text-heading);
        background: var(--bg-deep);
        padding: 0.15rem 0.5rem;
        border-radius: 999px;
    }
    .tl__marker {
        position: relative;
        width: 15px;
        height: 15px;
        margin: 0.4rem 0;
        border-radius: 50%;
        background: var(--bg-deep);
        border: 3px solid var(--accent);
    }

    .tl__nodes {
        position: relative;
        list-style: none;
        margin: 0;
        padding: 0;
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: clamp(1.25rem, 3vh, 2rem);
    }

    /* A node: a dot on the central branch + a card branching to one side. */
    .tlnode {
        position: relative;
        display: flex;
        min-height: 56px;
        align-items: center;
    }
    /* dot on the spine */
    .tlnode::before {
        content: "";
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 15px;
        height: 15px;
        border-radius: 50%;
        background: var(--bg-deep);
        border: 3px solid var(--accent);
        z-index: 2;
        transition: background var(--speed) var(--ease),
            border-color var(--speed) var(--ease), transform var(--speed) var(--ease);
    }
    .tlnode--education::before {
        border-color: var(--bg-light);
    }
    /* horizontal connector from the center spine out to the branched card. */
    .tlnode::after {
        content: "";
        position: absolute;
        top: 50%;
        width: calc(50% - 7.5px - 10px);
        height: 2px;
        background: rgba(255, 255, 255, 0.35);
    }
    .tlnode--left::after { right: calc(50% + 7.5px); }
    .tlnode--right::after { left: calc(50% + 7.5px); }
    .tlnode--left { justify-content: flex-start; }
    .tlnode--right { justify-content: flex-end; }

    .tlnode__card {
        position: relative;
        /* Sit above the spine + horizontal connector so no line shows through. */
        z-index: 3;
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
        /* Half-track-width cards that branch out to each side of the spine.
           The overall panel is full-width now (see .resume__split), so the
           timeline column has room for this without cramping the cards. */
        width: calc(50% - 22px);
        padding: 0.5rem 0.65rem;
        border-radius: var(--radius);
        /* Opaque, slightly darkened surface so the branch line reads as ending
           at the card edge rather than crossing through it. */
        background: var(--bg-deep);
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-left: 3px solid var(--accent);
        box-shadow: 0 4px 12px -6px rgba(0, 0, 0, 0.6);
        transition: transform var(--speed) var(--ease),
            border-color var(--speed) var(--ease), background var(--speed) var(--ease);
    }
    .tlnode--education .tlnode__card {
        border-left-color: var(--bg-light);
    }
    .tlnode--left .tlnode__card {
        text-align: right;
        border-left: 1px solid rgba(255, 255, 255, 0.14);
        border-right: 3px solid var(--accent);
    }
    .tlnode--left.tlnode--education .tlnode__card {
        border-right-color: var(--bg-light);
    }
    .tlnode__card:hover,
    .tlnode__card:focus-visible {
        transform: translateY(-1px);
        background: var(--surface);
    }

    .tlnode__kind {
        font-family: var(--font-mono);
        font-size: var(--fs-label);
        letter-spacing: 0.1em;
        text-transform: uppercase;
        font-weight: 700;
        color: var(--accent);
    }
    .tlnode--education .tlnode__kind {
        color: var(--bg-light);
    }
    .tlnode__title {
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--text);
        line-height: 1.25;
    }
    .tlnode__sub {
        font-size: 0.85rem;
        color: var(--text-muted);
    }
    .tlnode__dates {
        font-family: var(--font-mono);
        font-size: var(--fs-label);
        color: var(--text-muted);
        letter-spacing: 0.03em;
    }

    /* active node */
    .tlnode--active::before {
        background: var(--accent-dark);
        border-color: var(--accent-dark);
        transform: translate(-50%, -50%) scale(1.2);
        box-shadow: 0 0 0 5px rgba(209, 136, 4, 0.25);
    }
    .tlnode--active .tlnode__card {
        border-color: var(--accent-dark);
        /* Opaque base + a gold wash on top keeps the branch line hidden. */
        background:
            linear-gradient(rgba(209, 136, 4, 0.16), rgba(209, 136, 4, 0.16)),
            var(--bg-deep);
    }
    .tlnode--active.tlnode--left .tlnode__card {
        border-left-color: rgba(255, 255, 255, 0.14);
        border-right-color: var(--accent-dark);
    }

    /* ===================== RESUME CONTENT ===================== */
    .section {
        margin-bottom: clamp(2.5rem, 6vh, 4rem);
        padding-top: clamp(1rem, 3vh, 2rem);
        scroll-margin-top: 1rem; /* for the #skills jump inside the content pane */
    }
    .section__title {
        font-size: var(--fs-h2);
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
        color: var(--text-heading);
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
        /* A lifted surface + accent-tinted border so the pill reads as a pill
           against the page background even when the theme's deep/page colors
           sit close together (the slate ramp puts them within a few % of each
           other, which made a flat fill look like no pill at all). */
        background: var(--bg-light);
        color: var(--text);
        font-family: var(--font-mono);
        padding: 0.3rem 0.85rem;
        border: 1px solid color-mix(in srgb, var(--accent) 55%, transparent);
        border-radius: 999px;
        font-size: 0.9rem;
        box-shadow: 0 2px 6px -3px rgba(0, 0, 0, 0.6);
    }
    .skills__tag {
        display: inline-block;
        margin-left: 0.5rem;
        padding: 0.1rem 0.6rem;
        background: var(--accent);
        color: var(--text-on-accent);
        border-radius: 999px;
        font-family: var(--font-mono);
        font-size: var(--fs-label);
    }

    /* content entries (experience + education) */
    .entry {
        margin-bottom: 2.5rem;
        padding-left: 1rem;
        border-left: 3px solid transparent;
        scroll-margin-top: 1.5rem; /* offset within the scrolling content pane */
        transition: border-color var(--speed) var(--ease);
    }
    .entry--active {
        border-left-color: var(--accent);
    }
    .entry--education.entry--active {
        border-left-color: var(--bg-light);
    }
    .entry__head {
        display: flex;
        align-items: baseline;
        flex-wrap: wrap;
        gap: 0.5rem 0.75rem;
    }
    .entry__badge {
        font-family: var(--font-mono);
        font-size: var(--fs-label);
        letter-spacing: 0.1em;
        text-transform: uppercase;
        font-weight: 700;
        padding: 0.15rem 0.5rem;
        border-radius: 999px;
        background: var(--accent);
        color: var(--text-on-accent);
    }
    .entry--education .entry__badge {
        background: var(--bg-light);
        color: var(--text-on-accent);
    }
    .entry__title {
        font-size: 1.5rem;
        color: var(--text);
    }
    .entry__meta {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 0.25rem 1rem;
        margin-top: 0.5rem;
        font-family: var(--font-mono);
        font-size: var(--fs-meta);
        color: var(--text-secondary);
        font-weight: 700;
    }
    .entry__meta p {
        margin: 0;
    }
    .entry__points {
        margin: 0.6rem 0 0;
        padding-left: 1.4rem;
        color: var(--text);
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    /* ===================== RESPONSIVE ===================== */
    @media (max-width: 820px) {
        /* On small screens the branching timeline nav doesn't fit — hide it
           entirely and give the full width to the resume content so the reader
           stays focused on the resume itself. The page scrolls normally. */
        .resume {
            height: auto;
            min-height: 100vh;
            overflow: visible;
        }
        .resume__split {
            height: auto;
            grid-template-columns: 1fr;
            align-items: start;
            min-width: 0;
        }
        .tl {
            display: none;
        }
        .resume__content {
            height: auto;
            overflow: visible;
            /* Let this grid child shrink to the viewport instead of being forced
               wider by its content (would otherwise cause horizontal scroll). */
            min-width: 0;
        }
        .entry {
            padding-left: 0.75rem;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .tl__skills,
        .tlnode::before,
        .tlnode__card,
        .entry {
            transition: none;
        }
    }
</style>
