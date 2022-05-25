import {
  ActionFunction,
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
  let session = await storage.getSession(request.headers.get("Cookie"));
  let name = session.get("name");

  return { message: "this is awesome 😎", name: name || "Anonymous" };
};

export let action: ActionFunction = async ({ request }) => {
  let cookie = request.headers.get("Cookie");
  let session = await storage.getSession(cookie);
  let formData = await request.formData();

  session.flash("name", formData.get("name"));

  return redirect("/", {
    headers: {
      "Set-Cookie": await storage.commitSession(session),
    },
  });
};

export default function Index() {
  let data = useLoaderData();

  return (
    <div style={{ textAlign: "center", padding: 20 }}>
      <h2>Welcome to Remix!</h2>
      <p>
        <a href="https://remix.run/dashboard/docs">Check out the docs</a> to get
        started.
      </p>
      <p>Message from the loader: {data.message}</p>

      <h3>Hello {data.name}</h3>

      <Form method="post">
        <label>
          <span>Name:</span>
          <input type="text" name="name" />
        </label>
        <input type="submit" value="Submit" />
      </Form>
    </div>
  );
}
