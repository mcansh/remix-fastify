import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useLoaderData } from "@remix-run/react";

import { sessionStorage } from "~/session.server";

export let loader: LoaderFunction = async ({ request, context }) => {
  let cookie = request.headers.get("Cookie");
  let session = await sessionStorage.getSession(cookie);
  let name = session.get("name") || context?.defaultName || "Stranger";
  return json({ name });
};

export let action: ActionFunction = async ({ request }) => {
  let cookie = request.headers.get("Cookie");
  let session = await sessionStorage.getSession(cookie);
  let formData = await request.formData();

  let name = formData.get("name");

  if (!name) {
    throw new Response("Name is required", { status: 400 });
  }

  session.set("name", name);

  return redirect("/", {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
};

export default function Index() {
  let data = useLoaderData();

  return (
    <div style={{ padding: 20, textAlign: "center" }}>
      <h1>
        Welcome to{" "}
        <a
          target="_blank"
          rel="noreferrer nofollow noopener"
          href="https://remix.run"
        >
          Remix
        </a>{" "}
        running on{" "}
        <a
          target="_blank"
          rel="noreferrer nofollow noopener"
          href="https://fastify.io"
        >
          Fastify
        </a>
      </h1>

      <h2>Hello {data.name}</h2>

      <Form
        method="post"
        style={{ display: "flex", justifyContent: "center", gap: 4 }}
      >
        <label htmlFor="name">Name:</label>
        <input type="text" name="name" id="name" />
        <button type="submit">Submit</button>
      </Form>

      <Link style={{ marginTop: 10, display: "block" }} to="/page-2">
        Go to page 2
      </Link>
    </div>
  );
}
