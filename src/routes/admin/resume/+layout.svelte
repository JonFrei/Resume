<script>
    import { page } from "$app/stores";

    // Two sub-tabs under Resume: Web (the live-page editor) and Export (the PDF
    // header + preview). Active state keys off the pathname.
    $: path = $page.url.pathname;
    $: onExport = path.startsWith("/admin/resume/export");
</script>

<div class="admin-wrap admin-wrap--wide resume-subnav-wrap">
    <div class="admin-row">
        <h1 class="admin-title">Resume</h1>
        <a class="btn btn-sm" href="/admin">← Back</a>
    </div>

    <nav class="subtabs" aria-label="Resume sections">
        <a class="subtab" class:subtab--active={!onExport} href="/admin/resume" aria-current={!onExport ? "page" : undefined}>Web</a>
        <a class="subtab" class:subtab--active={onExport} href="/admin/resume/export" aria-current={onExport ? "page" : undefined}>Export</a>
    </nav>
</div>

<slot />

<style>
    /* Full-bleed: the header + tabs span the whole display area (matching the
       full-width canvas editors below), instead of the 1160px .admin-wrap--wide
       cap. Each child page manages its own width below. */
    .resume-subnav-wrap {
        max-width: none;
        padding-bottom: 0;
        padding-left: clamp(0.75rem, 2vw, 1.5rem);
        padding-right: clamp(0.75rem, 2vw, 1.5rem);
    }

    .subtabs {
        display: flex;
        gap: 0.4rem;
        margin: 0.5rem 0 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    }
    .subtab {
        padding: 0.6rem 1.1rem;
        border: 1px solid transparent;
        border-bottom: none;
        border-radius: 8px 8px 0 0;
        font-weight: 600;
        font-size: 0.95rem;
        color: var(--text-muted);
        text-decoration: none;
        transform: translateY(1px); /* sit the active tab flush over the border */
    }
    .subtab:hover { color: var(--text); }
    .subtab--active {
        color: var(--text);
        background: var(--surface, rgba(255, 255, 255, 0.05));
        border-color: rgba(255, 255, 255, 0.12);
        border-bottom-color: var(--surface, rgba(255, 255, 255, 0.05));
    }
</style>
