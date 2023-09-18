import * as React from "react";
import type { DataFunctionArgs } from "@remix-run/node";
import { defer, redirect } from "@remix-run/node";
import { Await, Form, useAsyncValue, useLoaderData } from "@remix-run/react";

import { sessionStorage } from "~/session.server";
import { sleep } from "~/sleep";

export async function loader({ request, context }: DataFunctionArgs) {
  let cookie = request.headers.get("Cookie");
  let session = await sessionStorage.getSession(cookie);
  return defer({
    name: sleep<string>(1_000, session.get("name") || "Anonymous"),
    loadContextName: context.loadContextName,
  });
}

export async function action({ request }: DataFunctionArgs) {
  let cookie = request.headers.get("Cookie");
  let session = await sessionStorage.getSession(cookie);
  let formData = await request.formData();

  let name = formData.get("name");

  if (formData.has("reset")) {
    session.unset("name");
    return redirect("/", {
      headers: {
        "Set-Cookie": await sessionStorage.commitSession(session),
      },
    });
  }

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
      <React.Suspense fallback={<h2>loading...</h2>}>
        <Await resolve={data.name} errorElement={<h2>failed...</h2>}>
          {(resolvedName) => (
            <h2>
              Hello {resolvedName}, with context name {data.loadContextName}
            </h2>
          )}
        </Await>
      </React.Suspense>

      <Form
        method="post"
        style={{ display: "flex", justifyContent: "center", gap: 4 }}
      >
        <label>
          <span>Name: </span>
          <React.Suspense fallback={<FallbackNameInput />}>
            <Await resolve={data.name}>
              <NameInput />
            </Await>
          </React.Suspense>
        </label>
        <button type="submit">Submit</button>
        <button name="reset" type="submit">
          Reset
        </button>
      </Form>
    </div>
  );
}

function NameInput() {
  let resolvedName = useAsyncValue() as string;
  let defaultValue = resolvedName === "Anonymous" ? "" : resolvedName;
  return (
    <input
      type="text"
      name="name"
      title="Enter your name"
      defaultValue={defaultValue}
    />
  );
}

function FallbackNameInput() {
  return <input type="text" name="name" title="Enter your name" />;
}
