import { data } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import "./styles/global.css";

export function loader() {
  return data({ message: "Hello from the root loader" });
}

export default function App() {
  let loaderData = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>Remix Starter with Fastify</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Welcome to Remix!" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <Meta />
        <Links />
      </head>
      <body>
        <div className="mx-auto max-w-max border-2 border-black bg-red-700 p-4 text-white">
          {loaderData.message}
        </div>
        <Outlet />
        <Scripts />
        <ScrollRestoration />
      </body>
    </html>
  );
}
