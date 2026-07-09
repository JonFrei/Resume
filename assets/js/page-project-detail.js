import { el, assetUrl, loadJSON, mountChrome, renderError } from "./site.js";

// Build the paragraph/list content column of a block.
function blockContent(block) {
    const parts = [el("h2.block__heading", {}, block.heading)];
    const body = el("div.block__body");

    (block.body || []).forEach((p) => body.append(el("p", {}, p)));

    if (block.list && block.list.items && block.list.items.length) {
        const listTag = block.list.ordered ? "ol.block__list" : "ul.block__list";
        body.append(el(listTag, {},
            block.list.items.map((item) => el("li", {}, item))
        ));
    }

    (block.bodyAfter || []).forEach((p) => body.append(el("p", {}, p)));

    parts.push(body);
    return el("div.block__content", {}, parts);
}

// Build the media column of a block.
function blockMedia(block) {
    if (!block.media || !block.media.length) return null;
    const cls = "block__media" + (block.mediaRow ? ".block__media--row" : "");
    return el(cls, {},
        block.media.map((m) => el("img", { src: assetUrl(m.src), alt: m.alt || "" }))
    );
}

function renderBlock(block) {
    const layout = block.layout || "left";
    const section = el(`section.block.block--${layout}`, {}, [blockContent(block)]);
    const media = blockMedia(block);
    if (media) section.append(media);
    return section;
}

function renderHero(project) {
    const children = [
        el("h1.project-hero__title", {}, project.title),
        el("p.project-hero__tagline", {}, project.tagline),
        el("p.project-hero__lead", {}, project.hero.lead),
    ];

    const gallery = project.hero.gallery || [];
    if (gallery.length) {
        children.push(el("div.project-hero__gallery", {},
            gallery.map((g) => el("img", { src: assetUrl(g.src), alt: g.alt || "" }))
        ));
    }
    return el("header.project-hero", {}, children);
}

async function main() {
    const app = document.querySelector("#app");
    const slug = document.body.dataset.slug;

    try {
        const [site, data] = await Promise.all([
            loadJSON("/data/site.json"),
            loadJSON("/data/projects.json"),
        ]);
        await mountChrome(site, { current: "/projects/", footerHeading: "Let's chat." });

        const project = data.projects.find((p) => p.slug === slug);
        if (!project || !project.detail) {
            document.title = "Project not found — Jonathan Freier";
            renderError(app, "That project could not be found.");
            return;
        }

        // Update document metadata now that we know the project.
        document.title = `${project.title} — Jonathan Freier`;

        const article = el("article.project-detail__inner", {}, [
            el("a.project-detail__back", { href: "/projects/" }, "← All projects"),
            renderHero(project),
        ]);

        (project.blocks || []).forEach((block) => article.append(renderBlock(block)));

        if (project.codeUrl) {
            article.append(
                el("div.project-detail__code", {}, [
                    el("a.btn.btn--solid", {
                        href: project.codeUrl,
                        target: "_blank",
                        rel: "noopener",
                    }, "Get code on GitHub"),
                ])
            );
        }

        app.replaceChildren(article);
    } catch (err) {
        console.error(err);
        renderError(app);
    }
}

main();
