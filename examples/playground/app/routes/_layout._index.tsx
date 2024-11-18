import * as React from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Await, Form, useAsyncValue, useLoaderData } from "@remix-run/react";

import { sessionStorage } from "~/session.server";
import { sleep } from "~/sleep";

export async function loader({ request, context }: LoaderFunctionArgs) {
  let cookie = request.headers.get("Cookie");
  let session = await sessionStorage.getSession(cookie);

  let loadContextName = context.loadContextName;

  if (typeof loadContextName !== "string") {
    throw new Error("loadContextName must be a string");
  }

  return {
    name: sleep<string>(1_000, session.get("name") || "Anonymous"),
    loadContextName,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  let cookie = request.headers.get("Cookie");
  let session = await sessionStorage.getSession(cookie);
  let formData = await request.formData();

  let intent = formData.get("intent");

  switch (intent) {
    case "submit": {
      let name = formData.get("name");
      if (!name) throw new Response("Name is required", { status: 400 });
      session.set("name", name);
      return redirect("/", {
        headers: {
          "Set-Cookie": await sessionStorage.commitSession(session),
        },
      });
    }
    case "reset": {
      session.unset("name");
      return redirect("/", {
        headers: {
          "Set-Cookie": await sessionStorage.commitSession(session),
        },
      });
    }
    default: {
      throw new Response("Invalid intent", { status: 400 });
    }
  }
}

export default function Index() {
  let loaderData = useLoaderData<typeof loader>();
  const [echo, setEcho] = React.useState<string | null>(null);

  return (
    <>
      <React.Suspense fallback={<h2 className="text-gray-400">loading...</h2>}>
        <Await resolve={loaderData.name} errorElement={<h2>failed...</h2>}>
          {(resolvedName) => <h2>Hello {resolvedName}</h2>}
        </Await>
      </React.Suspense>

      <h2>Context: {loaderData.loadContextName}</h2>

      <Form method="post" className="flex justify-center gap-2">
        <label>
          <span>Name: </span>
          <React.Suspense fallback={<FallbackNameInput />}>
            <Await resolve={loaderData.name}>
              <NameInput />
            </Await>
          </React.Suspense>
        </label>
        <button
          name="intent"
          value="submit"
          className="rounded-md bg-green-600 px-2 text-white"
          type="submit"
        >
          Submit
        </button>
        <button
          name="intent"
          value="reset"
          className="rounded-md bg-red-600 px-2 text-white"
          type="submit"
        >
          Reset
        </button>
      </Form>

      <form
        method="post"
        className="mx-auto mt-4 flex max-w-max flex-col justify-center gap-4"
        action="/api/echo"
        onSubmit={async (event) => {
          event.preventDefault();
          let formData = new FormData(event.currentTarget);
          let response = await fetch(event.currentTarget.action, {
            method: event.currentTarget.method,
            body: JSON.stringify(Object.fromEntries(formData.entries())),
            headers: { "Content-Type": "application/json" },
          });
          let json = await response.json();
          setEcho(json);
        }}
      >
        <div className="flex gap-2">
          <label>
            <span>Text: </span>
            <input type="text" name="text" />
          </label>
          <button
            name="intent"
            type="submit"
            value="echo"
            className="rounded-md bg-green-600 px-2 text-white"
          >
            Echo
          </button>
        </div>
        {echo ? <pre>{JSON.stringify(echo)}</pre> : null}
      </form>
    </>
  );
}

function NameInput() {
  let resolvedName = useAsyncValue();
  let defaultValue: string | undefined = undefined;
  if (typeof resolvedName === "string") {
    if (resolvedName !== "Anonymous") {
      defaultValue = resolvedName;
    }
  }

  return (
    <input
      type="text"
      name="name"
      placeholder="Enter your name"
      defaultValue={defaultValue}
      className="px-1"
    />
  );
}

function FallbackNameInput() {
  return (
    <input type="text" name="name" title="Enter your name" className="px-1" />
  );
}
