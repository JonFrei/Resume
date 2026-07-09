import { redirect } from "@sveltejs/kit";
import { SESSION_COOKIE } from "$lib/server/auth.js";

export const actions = {
    default: async ({ cookies }) => {
        cookies.delete(SESSION_COOKIE, { path: "/" });
        throw redirect(303, "/admin/login");
    },
};

// Direct GET just bounces home.
export const load = () => {
    throw redirect(303, "/admin");
};
