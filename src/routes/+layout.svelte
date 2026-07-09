<script>
    import "$lib/styles/base.css";
    import { themeToCss } from "$lib/theme.js";

    export let data;

    // Inline <style> overriding the base.css :root palette defaults with the
    // saved theme. Reactive so the admin theme editor's live preview updates
    // instantly when `data.theme` changes.
    $: themeCss = themeToCss(data?.theme);
</script>

<svelte:head>
    {@html `<style id="site-theme">${themeCss}</style>`}
</svelte:head>

<slot />
