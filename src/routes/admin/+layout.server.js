import { redirect } from "@sveltejs/kit";

/* Guard all /admin routes. The login page is exempt so users can reach it. */
export const load = ({ locals, url }) => {
    const isLogin = url.pathname === "/admin/login";
    if (!locals.authed && !isLogin) {
        throw redirect(303, "/admin/login");
    }
    return { authed: locals.authed };
};
