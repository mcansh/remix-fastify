import {
  MetaFunction,
  LinksFunction,
  LoaderFunction,
  ActionFunction,
  redirect,
  useLoaderData,
  useActionData,
  json,
} from "remix";

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
  let formData = await request.formData();

  console.log({ formData: Object.fromEntries(formData) });

  return json({ name: formData.get("name") });
};

export default function Index() {
  let data = useLoaderData();
  let actionData = useActionData();

  return (
    <div style={{ textAlign: "center", padding: 20 }}>
      <h2>Welcome to Remix!!!</h2>
      <p>
        <a href="https://remix.run/dashboard/docs">Check out the docs</a> to get
        started.
      </p>
      <p>Message from the loader: {data.message}</p>

      {actionData ? (
        <h3>Hello {actionData.name}</h3>
      ) : (
        <form action="/?index" method="post">
          <label>
            <span>Name:</span>
            <input type="text" name="name" />
          </label>
          <input type="submit" value="Submit" />
        </form>
      )}
    </div>
  );
}
