import * as React from "react";
import { Await, Form, redirect, useAsyncValue } from "react-router";
import { sessionStorage } from "~/session.server";
import { sleep } from "~/utils";
import type { Route } from "./+types/_layout._index";
import { Button } from "~/components/button";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";

export async function loader({ context, request }: Route.LoaderArgs) {
  let cookie = request.headers.get("Cookie");
  let session = await sessionStorage.getSession(cookie);

  // let loadContextName = context.loadContextName;

  // if (typeof loadContextName !== "string") {
  //   throw new Error("loadContextName must be a string");
  // }

  return {
    name: sleep<string>(1_000, session.get("name") || "Anonymous"),
    // loadContextName,
  };
}

export async function action({ request }: Route.ActionArgs) {
  let cookie = request.headers.get("Cookie");
  let session = await sessionStorage.getSession(cookie);
  let formData = await request.formData();

  let intent = formData.get("intent");

  switch (intent) {
    case "submit": {
      let name = formData.get("name");
      if (!name) throw new Response("Name is required", { status: 400 });
      session.set("name", name);
      throw redirect("/", {
        headers: {
          "Set-Cookie": await sessionStorage.commitSession(session),
        },
      });
    }
    case "reset": {
      session.unset("name");
      throw redirect("/", {
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

export default function Index({ loaderData }: Route.ComponentProps) {
  const [echo, setEcho] = React.useState<string | null>(null);

  return (
    <>
      <React.Suspense fallback={<h2 className="text-gray-400">loading...</h2>}>
        <Await resolve={loaderData.name} errorElement={<h2>failed...</h2>}>
          {(resolvedName) => <h2>Hello {resolvedName}</h2>}
        </Await>
      </React.Suspense>

      <h2 className="text-3xl font-bold tracking-tight">
        Context: {loaderData.loadContextName}
      </h2>

      <Form method="post" className="flex justify-center gap-2">
        <Label>
          <span>Name: </span>
          <React.Suspense fallback={<FallbackNameInput />}>
            <Await resolve={loaderData.name}>
              <NameInput />
            </Await>
          </React.Suspense>
        </Label>
        <Button name="intent" value="submit" type="submit">
          Submit
        </Button>
        <Button name="intent" value="reset" type="submit" variant="destructive">
          Reset
        </Button>
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
          <Label>
            <span>Text: </span>
            <Input type="text" name="text" />
          </Label>
          <Button name="intent" type="submit" value="echo">
            Echo
          </Button>
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
    <Input
      type="text"
      name="name"
      placeholder="Enter your name"
      defaultValue={defaultValue}
    />
  );
}

function FallbackNameInput() {
  return <Input type="text" name="name" title="Enter your name" />;
}
