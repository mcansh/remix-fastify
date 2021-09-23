import {
  MetaFunction,
  LinksFunction,
  LoaderFunction,
  ActionFunction,
  redirect,
} from "remix";
import { useRouteData } from "remix";

import stylesUrl from "../styles/index.css";

export let meta: MetaFunction = () => {
  return {
    title: "Remix Starter",
    description: "Welcome to remix!",
  };
};

export let links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

export let loader: LoaderFunction = async () => {
  return { message: "this is awesome 😎" };
};

export let action: ActionFunction = async ({ request }) => {
  let body = await request.text();
  let formData = new URLSearchParams(body);

  console.log({ formData });

  return redirect("/");
};

export default function Index() {
  let data = useRouteData();

  return (
    <div style={{ textAlign: "center", padding: 20 }}>
      <h2>Welcome to Remix!!!</h2>
      <p>
        <a href="https://remix.run/dashboard/docs">Check out the docs</a> to get
        started.
      </p>
      <p>Message from the loader: {data.message}</p>

      <form action="/" method="post">
        <input type="text" name="name" />
        <input type="submit" value="Submit" />
      </form>
    </div>
  );
}
