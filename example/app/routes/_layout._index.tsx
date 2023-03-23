import * as React from "react";
import type { DataFunctionArgs } from "@remix-run/node";
import { defer, redirect } from "@remix-run/node";
import { Await, Form, Link, useLoaderData } from "@remix-run/react";

import { sessionStorage } from "~/session.server";

export async function loader({ request, context }: DataFunctionArgs) {
  function sleep<T>(ms: number, value: T) {
    return new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));
  }

  let cookie = request.headers.get("Cookie");
  let session = await sessionStorage.getSession(cookie);
  let name = sleep<string>(1_000, session.get("name") || "Anonymous");
  let loadContextName = context.loadContextName;

  if (!loadContextName) {
    loadContextName = "no load context name";
  }

  return defer({ name, loadContextName }, { status: 200, headers: {} });
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
  let { loadContextName, name } = useLoaderData<typeof loader>();

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

      <h3>{loadContextName}</h3>

      <React.Suspense fallback={<h2>loading...</h2>}>
        <Await resolve={name} errorElement={<h2>failed...</h2>}>
          {(resolvedName) => (
            <h2>
              Hello {resolvedName}, with context name {loadContextName}
            </h2>
          )}
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
