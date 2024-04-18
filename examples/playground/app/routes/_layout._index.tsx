import * as React from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { defer, redirect } from "@remix-run/node";
import { Await, Form, useAsyncValue, useLoaderData } from "@remix-run/react";

// silence the warning due to root eslint config and example eslint config conflicts
// eslint-disable-next-line import/no-unresolved
import { sessionStorage, getSession } from "~/session.server";
// eslint-disable-next-line import/no-unresolved
import { sleep } from "~/sleep";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const session = await getSession(request);

  const loadContextName = context.loadContextName;

  if (typeof loadContextName !== "string") {
    throw new Error("loadContextName must be a string");
  }

  return defer({
    name: sleep<string>(1_000, session.get("name") || "Anonymous"),
    loadContextName,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request);
  const formData = await request.formData();

  const name = formData.get("name");

  if (formData.has("reset")) {
    session.unset("name");
    return redirect("/", {
      headers: { "Set-Cookie": await sessionStorage.commitSession(session) },
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
  const data = useLoaderData<typeof loader>();
  const [echo, setEcho] = React.useState<string | null>(null);

  return (
    <div>
      <React.Suspense fallback={<h2>loading...</h2>}>
        <Await resolve={data.name} errorElement={<h2>failed...</h2>}>
          {(resolvedName) => <h2>Hello {resolvedName}</h2>}
        </Await>
      </React.Suspense>

      <h2>Context: {data.loadContextName}</h2>

      <Form
        method="post"
        style={{ display: "flex", justifyContent: "center", gap: 4 }}
      >
        <label htmlFor="name">
          <span>Name: </span>
          <React.Suspense fallback={<FallbackNameInput />}>
            <Await resolve={data.name}>
              <NameInput />
            </Await>
          </React.Suspense>
        </label>
        <button name="intent" value="submit" type="submit">
          Submit
        </button>
        <button name="intent" value="reset" type="submit">
          Reset
        </button>
      </Form>

      <form
        method="post"
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 4,
          marginTop: 16,
          flexDirection: "column",
        }}
        action="/api/echo"
        onSubmit={async (event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const response = await fetch(event.currentTarget.action, {
            method: event.currentTarget.method,
            body: JSON.stringify(Object.fromEntries(formData.entries())),
            headers: {
              "Content-Type": "application/json",
            },
          });
          const json = await response.json();
          setEcho(json);
        }}
      >
        <div>
          <input type="text" name="text" />
          <button name="intent" type="submit" value="echo">
            Echo
          </button>
        </div>
        {echo ? <pre>{JSON.stringify(echo)}</pre> : null}
      </form>
    </div>
  );
}

function NameInput() {
  const resolvedName = useAsyncValue();
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
      id="name"
      placeholder="Enter your name"
      defaultValue={defaultValue}
    />
  );
}

function FallbackNameInput() {
  return <input type="text" name="name" title="Enter your name" />;
}
