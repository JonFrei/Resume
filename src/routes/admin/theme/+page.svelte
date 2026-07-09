<script>
    import { enhance } from "$app/forms";
    import { invalidateAll } from "$app/navigation";
    import { TOKENS, DEFAULT_THEME, themeToCss, normalizeTheme } from "$lib/theme.js";

    export let data;
    export let form;

    // Local editable copy of the theme.
    let theme = { ...normalizeTheme(data.theme) };

    // Group tokens for display.
    const groups = TOKENS.reduce((acc, t) => {
        (acc[t.group] ||= []).push(t);
        return acc;
    }, {});

    // Live preview: inline CSS that re-themes THIS page (and, on save +
    // invalidateAll, the whole app) as the pickers change.
    $: previewCss = themeToCss(theme);
    $: payload = JSON.stringify(theme);

    // A representative swatch palette derived from the current values, so the
    // preview panel shows how surfaces/accents/text look together.
    function reset() {
        theme = { ...DEFAULT_THEME };
    }

    let saving = false;
    const submit = () => {
        saving = true;
        return async ({ update }) => {
            await update({ reset: false });
            // Re-run root layout load so the saved theme applies site-wide.
            await invalidateAll();
            saving = false;
        };
    };
</script>

<svelte:head>
    <title>Theme — Admin</title>
    <!-- Live-preview override for the whole admin app while editing. -->
    {@html `<style>${previewCss}</style>`}
</svelte:head>

<div class="admin-wrap">
    <div class="admin-row">
        <h1 class="admin-title">Theme</h1>
        <a class="btn btn-sm" href="/admin">← Back</a>
    </div>

    {#if !data.hasDatabase}
        <p class="flash flash--err">
            No database is configured (DATABASE_URL unset). You can preview color
            changes here, but they can't be saved until a database is attached.
        </p>
    {/if}
    {#if form?.saved}
        <p class="flash flash--ok">Theme saved. It's now live across the site.</p>
    {/if}
    {#if form?.error}
        <p class="flash flash--err">{form.error}</p>
    {/if}

    <p class="theme-intro">
        Edit the site's color palette. Changes preview instantly below; click
        <strong>Save theme</strong> to apply them everywhere.
    </p>

    <div class="theme-grid">
        <form class="form theme-form" method="POST" use:enhance={submit}>
            <input type="hidden" name="payload" value={payload} />

            {#each Object.entries(groups) as [groupName, tokens]}
                <fieldset class="fieldset">
                    <legend>{groupName}</legend>
                    <div class="swatches">
                        {#each tokens as tk}
                            <label class="swatch">
                                <input
                                    class="swatch__picker"
                                    type="color"
                                    bind:value={theme[tk.key]}
                                    aria-label={tk.label}
                                />
                                <span class="swatch__meta">
                                    <span class="swatch__label">{tk.label}</span>
                                    <input
                                        class="swatch__hex"
                                        type="text"
                                        bind:value={theme[tk.key]}
                                        spellcheck="false"
                                    />
                                </span>
                            </label>
                        {/each}
                    </div>
                </fieldset>
            {/each}

            <div class="actions-bar">
                <button class="btn btn--solid" type="submit" disabled={saving || !data.hasDatabase}>
                    {saving ? "Saving…" : "Save theme"}
                </button>
                <button class="btn btn-sm" type="button" on:click={reset}>Reset to defaults</button>
            </div>
        </form>

        <!-- Live preview: uses the same semantic tokens as the real site. -->
        <aside class="preview" aria-label="Theme preview">
            <h2 class="preview__title">Preview</h2>
            <div class="preview__surface">
                <div class="preview__nav">Jonathan Freier</div>
                <div class="preview__body">
                    <h3>Section heading</h3>
                    <p>Body text on the site background gradient.</p>
                    <p class="preview__muted">Muted secondary text.</p>
                    <div class="preview__btns">
                        <span class="btn btn--solid">Accent button</span>
                        <span class="btn">Outline button</span>
                    </div>
                    <span class="preview__pill">tag pill</span>
                </div>
                <div class="preview__footer">Footer / contact band</div>
            </div>
        </aside>
    </div>
</div>

<style>
    .theme-intro {
        color: var(--text-muted);
        margin-bottom: 1.5rem;
    }
    .theme-grid {
        display: grid;
        grid-template-columns: 1fr 320px;
        gap: 1.5rem;
        align-items: start;
    }
    .swatches {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 0.75rem;
    }
    .swatch {
        display: flex;
        align-items: center;
        gap: 0.6rem;
    }
    .swatch__picker {
        width: 46px;
        height: 46px;
        padding: 0;
        border: 2px solid var(--accent);
        border-radius: var(--radius);
        background: none;
        cursor: pointer;
        flex-shrink: 0;
    }
    .swatch__meta {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        min-width: 0;
    }
    .swatch__label {
        font-size: 0.8rem;
        color: var(--text);
    }
    .swatch__hex {
        font-family: var(--font);
        font-size: 0.85rem;
        width: 8ch;
        padding: 0.2rem 0.4rem;
        border-radius: 4px;
        border: 1px solid var(--accent);
        background: var(--bg-deep);
        color: var(--text);
    }

    /* Preview panel — sticky so it stays visible while scrolling the pickers. */
    .preview {
        position: sticky;
        top: 1rem;
    }
    .preview__title {
        font-size: 1rem;
        color: var(--text-muted);
        margin-bottom: 0.5rem;
    }
    .preview__surface {
        border: 2px solid var(--accent);
        border-radius: var(--radius);
        overflow: hidden;
    }
    .preview__nav {
        background: var(--accent);
        color: var(--text-on-accent);
        font-weight: 700;
        padding: 0.6rem 0.9rem;
    }
    .preview__body {
        background: linear-gradient(180deg, var(--bg-page-start) 0%, var(--bg-page-end) 100%);
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
    }
    .preview__body h3 {
        color: var(--text);
    }
    .preview__body p {
        margin: 0;
        color: var(--text);
    }
    .preview__muted {
        color: var(--text-muted) !important;
        font-size: 0.85rem;
    }
    .preview__btns {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-top: 0.3rem;
    }
    .preview__btns .btn {
        min-height: 0;
        padding: 0.4rem 0.9rem;
        font-size: 0.85rem;
    }
    .preview__pill {
        align-self: flex-start;
        background: var(--accent);
        color: var(--text-on-accent);
        padding: 0.2rem 0.7rem;
        border-radius: 999px;
        font-size: 0.8rem;
    }
    .preview__footer {
        background: linear-gradient(180deg, var(--accent) 0%, var(--accent-dark) 100%);
        color: var(--text-on-accent);
        padding: 0.8rem 0.9rem;
        text-align: center;
        font-size: 0.85rem;
    }

    @media (max-width: 800px) {
        .theme-grid {
            grid-template-columns: 1fr;
        }
        .preview {
            position: static;
        }
    }
</style>
