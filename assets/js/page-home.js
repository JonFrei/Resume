import { el, assetUrl, externalAttrs, loadJSON, mountChrome, renderError } from "./site.js";

async function main() {
    const app = document.querySelector("#app");
    try {
        const site = await loadJSON("/data/site.json");
        await mountChrome(site, { current: "/" });

        const h = site.hero;

        const links = el("div.hero__links", {},
            h.links.map((link) =>
                el("a.hero__link", {
                    href: link.href,
                    "aria-label": link.label,
                    ...externalAttrs(link.external),
                }, [el("img", { src: assetUrl(link.img), alt: link.label })])
            )
        );

        const cta = el("div.hero__cta", {}, [
            el("a.btn.btn--solid", { href: "/projects/" }, "View Projects"),
            el("a.btn", { href: "/resume/" }, "View Resume"),
        ]);

        const hero = el("section.hero", {}, [
            el("h1.hero__title", {}, h.name),
            el("p.hero__subtitle", {}, h.subtitle),
            links,
            cta,
        ]);

        app.replaceChildren(hero);
    } catch (err) {
        console.error(err);
        renderError(app);
    }
}

main();
