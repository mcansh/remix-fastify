import {
  MetaFunction,
  LinksFunction,
  LoaderFunction,
  ActionFunction,
  redirect,
  useLoaderData,
} from "remix";

import { storage } from "~/session";
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

  return { message: "this is awesome 😎", name };
};

export let action: ActionFunction = async ({ request }) => {
  let formData = await request.formData();
  let session = await storage.getSession(request.headers.get("Cookie"));

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
      <h2>Welcome to Remix!!!</h2>
      <p>
        <a href="https://remix.run/dashboard/docs">Check out the docs</a> to get
        started.
      </p>
      <p>Message from the loader: {data.message}</p>

      {data.name && <h3>Hello {data.name}</h3>}

      <form action="/?index" method="post">
        <label>
          <span>Name:</span>
          <input type="text" name="name" />
        </label>
        <input type="submit" value="Submit" />
      </form>
    </div>
  );
}
