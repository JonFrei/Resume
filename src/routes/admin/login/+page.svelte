<script>
    import { enhance } from "$app/forms";
    export let form;
</script>

<svelte:head>
    <title>Admin Login</title>
    <meta name="robots" content="noindex" />
</svelte:head>

<main class="login">
    <form method="POST" use:enhance class="login__card">
        <h1 class="login__title">Admin</h1>

        {#if !form?.configured && form?.configured !== undefined}
            <p class="login__error">Auth not configured on the server.</p>
        {/if}
        {#if form?.error}
            <p class="login__error">{form.error}</p>
        {/if}

        <label class="login__label" for="password">Password</label>
        <input
            class="login__input"
            id="password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
            autofocus
        />

        <button class="btn btn--solid login__btn" type="submit">Log in</button>
        <a class="login__home" href="/">← Back to site</a>
    </form>
</main>

<style>
    .login {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        background: linear-gradient(160deg, var(--bg-mid) 0%, var(--bg-light) 100%);
    }
    .login__card {
        width: 100%;
        max-width: 360px;
        background: var(--surface);
        border: 2px solid var(--accent);
        border-radius: var(--radius);
        padding: 2rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    }
    .login__title {
        color: var(--text);
        margin-bottom: 0.5rem;
    }
    .login__label {
        color: var(--text-muted);
        font-size: 0.9rem;
    }
    .login__input {
        font-family: var(--font);
        font-size: 1rem;
        padding: 0.7rem 0.9rem;
        border-radius: var(--radius);
        border: 2px solid var(--accent);
        background: var(--bg-deep);
        color: var(--text);
    }
    .login__input:focus {
        outline: 2px solid var(--accent);
        outline-offset: 1px;
    }
    .login__btn {
        margin-top: 0.5rem;
    }
    .login__error {
        color: #ffd7d7;
        background: rgba(180, 30, 30, 0.35);
        border: 1px solid #d16a6a;
        border-radius: var(--radius);
        padding: 0.5rem 0.75rem;
        margin: 0;
        font-size: 0.9rem;
    }
    .login__home {
        color: var(--text-muted);
        font-size: 0.85rem;
        text-align: center;
        margin-top: 0.5rem;
    }
</style>
