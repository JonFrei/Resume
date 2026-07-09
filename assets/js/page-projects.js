import { el, assetUrl, externalAttrs, loadJSON, mountChrome, renderError } from "./site.js";

// Where a card links: internal detail page or an external URL.
function cardHref(p) {
    if (p.detail) return `/projects/${p.slug}/`;
    return p.url || "#";
}

function projectCard(p) {
    const external = !p.detail && !!p.url;
    return el("a.project-card", {
        href: cardHref(p),
        ...externalAttrs(external),
    }, [
        el("img.project-card__img", { src: assetUrl(p.thumb), alt: p.title }),
        el("div.project-card__body", {}, [
            el("h2.project-card__title", {}, p.title),
            el("p.project-card__tags", {}, p.tagline),
        ]),
    ]);
}

async function main() {
    const app = document.querySelector("#app");
    try {
        const [site, data] = await Promise.all([
            loadJSON("/data/site.json"),
            loadJSON("/data/projects.json"),
        ]);
        await mountChrome(site, { current: "/projects/", footerHeading: "Let's work together." });

        const intro = el("header.projects__intro", {}, [
            el("h1.projects__title", {}, "Projects"),
            el("p.projects__lead", {}, "A selection of robotics, controls, and web work."),
        ]);

        const grid = el("section.project-grid", { "aria-label": "Project list" },
            data.projects.map(projectCard)
        );

        app.replaceChildren(intro, grid);
    } catch (err) {
        console.error(err);
        renderError(app);
    }
}

main();
