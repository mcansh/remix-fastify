import { createCookieSessionStorage } from "@remix-run/node";

let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set");
}

export let sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "RJ_session",
    secrets: [sessionSecret],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
  },
});
