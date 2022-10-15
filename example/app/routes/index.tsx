import {
  ActionFunction,
  json,
  LinksFunction,
  LoaderFunction,
  MetaFunction,
  redirect,
} from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { storage } from "~/session.server";
import stylesUrl from "~/styles/index.css";

export let meta: MetaFunction = () => {
  return {
    title: "Remix Starter",
    description: "Welcome to remix!",
  };
};

export let links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

export let loader: LoaderFunction = async ({ request }) => {
  let cookie = request.headers.get("Cookie");
  let session = await storage.getSession(cookie);
  let name = session.get("name") || "Stranger";
  return json({ name });
};

export let action: ActionFunction = async ({ request }) => {
  let cookie = request.headers.get("Cookie");
  let session = await storage.getSession(cookie);
  let formData = await request.formData();

  let name = formData.get("name");

  if (!name) {
    throw new Response("Name is required", { status: 400 });
  }

  session.set("name", name);

  return redirect("/", {
    headers: {
      "Set-Cookie": await storage.commitSession(session),
    },
  });
};

export default function Index() {
  let data = useLoaderData();

  return (
    <div className="container">
      <h1>
        Welcome to{" "}
        <a target="_blank" rel="nofollow noopener" href="https://remix.run">
          Remix
        </a>{" "}
        running on{" "}
        <a target="_blank" rel="nofollow noopener" href="https://fastify.io">
          Fastify
        </a>
      </h1>

      <h2>Hello {data.name}</h2>

      <Form method="post">
        <label>
          <span>Name:</span> <input type="text" name="name" />
        </label>{" "}
        <button type="submit">Submit</button>
      </Form>
    </div>
  );
}
