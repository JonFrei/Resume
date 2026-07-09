<script>
    import { assetUrl } from "$lib/assets.js";
    export let block;
    export let base = "";

    $: layout = block.layout || "left";
</script>

<section class="block block--{layout}">
    <div class="block__content">
        <h2 class="block__heading">{block.heading}</h2>
        <div class="block__body">
            {#each block.body || [] as p}
                <p>{p}</p>
            {/each}

            {#if block.list && block.list.items && block.list.items.length}
                {#if block.list.ordered}
                    <ol class="block__list">
                        {#each block.list.items as item}<li>{item}</li>{/each}
                    </ol>
                {:else}
                    <ul class="block__list">
                        {#each block.list.items as item}<li>{item}</li>{/each}
                    </ul>
                {/if}
            {/if}

            {#each block.bodyAfter || [] as p}
                <p>{p}</p>
            {/each}
        </div>
    </div>

    {#if block.media && block.media.length}
        <div class="block__media" class:block__media--row={block.mediaRow}>
            {#each block.media as m}
                <img src={assetUrl(m.src, base)} alt={m.alt || ""} />
            {/each}
        </div>
    {/if}
</section>

<style>
    .block {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: clamp(1.25rem, 4vw, 2.5rem);
        align-items: center;
        margin: clamp(2rem, 6vh, 4rem) 0;
    }
    .block--right .block__media {
        order: 2;
    }
    .block--full {
        grid-template-columns: 1fr;
    }
    .block__heading {
        font-size: clamp(1.4rem, 3.5vw, 2rem);
        color: var(--text);
        padding-bottom: 0.4rem;
        margin-bottom: 1rem;
        border-bottom: 3px solid var(--accent);
    }
    .block__body {
        color: var(--text);
        font-size: 1.02rem;
    }
    .block__body p {
        margin: 0 0 1rem;
    }
    .block__list {
        margin: 0 0 1rem;
        padding-left: 1.4rem;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        color: var(--text);
    }
    .block__media {
        display: grid;
        gap: 1rem;
    }
    .block__media img {
        width: 100%;
        object-fit: cover;
        border: 2px solid var(--accent);
        border-radius: var(--radius);
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
    }
    .block__media--row {
        grid-auto-flow: column;
        grid-auto-columns: 1fr;
    }
    @media (max-width: 768px) {
        .block {
            grid-template-columns: 1fr;
        }
        .block--right .block__media {
            order: 0;
        }
        .block__media--row {
            grid-auto-flow: row;
        }
    }
</style>
