import * as React from "react";
import type { DataFunctionArgs } from "@remix-run/node";
import { defer, redirect } from "@remix-run/node";
import { Await, Form, Link, useLoaderData } from "@remix-run/react";

import { sessionStorage } from "~/session.server";

export async function loader({ request, context }: DataFunctionArgs) {
  let cookie = request.headers.get("Cookie");
  let session = await sessionStorage.getSession(cookie);
  let name = new Promise((resolve) =>
    setTimeout(() => resolve(session.get("name") || "Anonymous"), 1_000)
  );

  return defer({ name });
}

export async function action({ request }: DataFunctionArgs) {
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
}

export default function Index() {
  let data = useLoaderData<typeof loader>();

  return (
    <div>
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

      <React.Suspense fallback={<h2>loading...</h2>}>
        <Await resolve={data.name} errorElement={<h2>failed...</h2>}>
          {(resolvedName) => <h2>Hello {resolvedName}</h2>}
        </Await>
      </React.Suspense>

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
