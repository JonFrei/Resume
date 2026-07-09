/* site.js — shared rendering helpers used by every page.
   Fetches /data/site.json and renders the header + footer so navigation and
   contact links live in exactly one place. Also exposes small DOM helpers.

   The same JSON is intended to be served by an Express API in a later phase;
   only the fetch URL would change. */

/* ---------- DOM helpers ---------- */

// el('a.foo', {href:'/'}, [children]) → HTMLElement
export function el(spec, attrs = {}, children = []) {
    const [tag, ...classes] = spec.split(".");
    const node = document.createElement(tag || "div");
    if (classes.length) node.className = classes.join(" ");

    for (const [key, value] of Object.entries(attrs)) {
        if (value == null || value === false) continue;
        if (key === "text") node.textContent = value;
        else if (key === "html") node.innerHTML = value;
        else node.setAttribute(key, value === true ? "" : value);
    }

    for (const child of [].concat(children)) {
        if (child == null) continue;
        node.append(child.nodeType ? child : document.createTextNode(child));
    }
    return node;
}

// Attributes applied to links that leave the site.
export function externalAttrs(isExternal) {
    return isExternal ? { target: "_blank", rel: "noopener" } : {};
}

/* ---------- Asset URLs ---------- */

// Base URL for images, injected by the server via /config.js
// (window.__ASSET_BASE__). Empty => images served locally from this origin;
// set to an R2/CDN origin => images served from there.
const ASSET_BASE = (
    typeof window !== "undefined" && window.__ASSET_BASE__
        ? window.__ASSET_BASE__
        : ""
).replace(/\/$/, "");

// Resolve an asset path (e.g. "/assets/img/x.png") against ASSET_BASE.
// Absolute http(s) URLs and non-asset paths are returned unchanged.
export function assetUrl(src) {
    if (!src) return src;
    if (/^https?:\/\//i.test(src)) return src;      // already absolute
    if (!ASSET_BASE) return src;                     // local: leave as-is
    if (src.startsWith("/assets/")) return ASSET_BASE + src;
    return src;
}

/* ---------- Data ---------- */

export async function loadJSON(path) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return res.json();
}

/* ---------- Header ---------- */

// current: the nav href that should be marked as the active page (e.g. "/projects/").
function buildHeader(site, current) {
    const menu = el("ul.nav__menu", { id: "nav-menu" },
        site.nav.map((item) => {
            const isCurrent = item.href === current;
            return el("li", {}, [
                el("a.nav__link", {
                    href: item.href,
                    "aria-current": isCurrent ? "page" : null,
                }, item.label),
            ]);
        })
    );

    const toggle = el("button.nav__toggle", {
        type: "button",
        "aria-label": "Toggle navigation menu",
        "aria-controls": "nav-menu",
        "aria-expanded": "false",
    }, [el("span.bar"), el("span.bar"), el("span.bar")]);

    const nav = el("nav.nav", { "aria-label": "Primary" }, [
        el("a.nav__brand", { href: "/" }, site.brand),
        menu,
        toggle,
    ]);

    return el("header.site-header", {}, [nav]);
}

// Wire up the mobile hamburger for a freshly rendered header.
function wireNav(header) {
    const toggle = header.querySelector(".nav__toggle");
    const menu = header.querySelector(".nav__menu");
    if (!toggle || !menu) return;

    const close = () => {
        toggle.classList.remove("is-open");
        menu.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
    };

    toggle.addEventListener("click", () => {
        const open = menu.classList.toggle("is-open");
        toggle.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", String(open));
    });

    menu.querySelectorAll(".nav__link").forEach((link) =>
        link.addEventListener("click", close)
    );
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") close();
    });
}

/* ---------- Footer ---------- */

function buildFooter(site, heading) {
    const social = el("nav.social", { "aria-label": "Contact links" },
        site.social.map((s) =>
            el("a.social__link", {
                href: s.href,
                ...externalAttrs(s.external),
            }, s.label)
        )
    );

    return el("footer.site-footer", { id: "contact" }, [
        el("h2.site-footer__heading", {}, heading),
        social,
    ]);
}

/* ---------- Mount ---------- */

/*
 * Renders the shared header (and optional footer) into placeholders.
 * Every page includes:
 *   <div data-header></div>   ... and optionally ...   <div data-footer></div>
 * Options: { current, footerHeading }
 */
export async function mountChrome(site, { current, footerHeading } = {}) {
    const headerSlot = document.querySelector("[data-header]");
    if (headerSlot) {
        const header = buildHeader(site, current);
        headerSlot.replaceWith(header);
        wireNav(header);
    }

    const footerSlot = document.querySelector("[data-footer]");
    if (footerSlot && footerHeading) {
        footerSlot.replaceWith(buildFooter(site, footerHeading));
    }
}

// Show a simple error message inside a container if data fails to load.
export function renderError(container, message) {
    container.replaceChildren(
        el("p", { style: "padding:2rem;text-align:center;color:#fff;" },
            message || "Sorry — something went wrong loading this page.")
    );
}
