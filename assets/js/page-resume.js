import { el, loadJSON, mountChrome, renderError } from "./site.js";

function skillItem(item) {
    // Item is either a plain string or { text, tag }.
    if (typeof item === "string") return el("li", {}, item);
    return el("li", {}, [
        item.text + " ",
        el("span.skills__tag", {}, item.tag),
    ]);
}

function skillGroup(group) {
    const listCls = group.style === "tags"
        ? "ul.skills__list.skills__list--tags"
        : "ul.skills__list";
    return el("div.skills__group", {}, [
        el("h3.skills__heading", {}, group.heading),
        el(listCls, {}, group.items.map(skillItem)),
    ]);
}

function role(r) {
    return [
        el("div.job__role", {}, [
            el("p.job__title", {}, r.title),
            el("p.job__dates", {}, r.dates),
        ]),
        el("ul.job__points", {}, r.points.map((pt) => el("li", {}, pt))),
    ];
}

function jobArticle(job) {
    const children = [el("h3.job__company", {}, job.company)];
    job.roles.forEach((r) => children.push(...role(r)));
    return el("article.job", { id: job.id }, children);
}

// Jump-nav links: Skills + first company of each experience entry.
function jumpNav(resume) {
    const links = [el("li", {}, [el("a.jump__link", { href: "#skills" }, "Skills")])];
    resume.experience.forEach((job) => {
        links.push(el("li", {}, [
            el("a.jump__link", { href: `#${job.id}` }, job.company),
        ]));
    });
    return el("aside.resume__nav", { "aria-label": "Section navigation" }, [
        el("ul.jump", {}, links),
    ]);
}

async function main() {
    const app = document.querySelector("#app");
    try {
        const [site, resume] = await Promise.all([
            loadJSON("/data/site.json"),
            loadJSON("/data/resume.json"),
        ]);
        await mountChrome(site, {
            current: "/resume/",
            footerHeading: "How would you like to connect?",
        });

        const skillsSection = el("section.section", { id: "skills" }, [
            el("h2.section__title", {}, "Skills"),
            el("div.skills", {}, resume.skills.map(skillGroup)),
        ]);

        const expSection = el("section.section", {}, [
            el("h2.section__title", {}, "Professional Experience"),
            ...resume.experience.map(jobArticle),
        ]);

        const layout = el("div.resume__layout", {}, [
            jumpNav(resume),
            el("div.resume__content", {}, [skillsSection, expSection]),
        ]);

        app.replaceChildren(layout);
    } catch (err) {
        console.error(err);
        renderError(app);
    }
}

main();
