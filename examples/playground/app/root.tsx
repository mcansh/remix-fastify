import type { LinksFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";

import stylesUrl from "./styles/global.css?url";

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

export function loader() {
  return json({ message: "Hello from the root loader" });
}

export default function App() {
  const data = useLoaderData<typeof loader>();
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
        <div className="root-message">{data.message}</div>
        <Outlet />
        <Scripts />
        <ScrollRestoration />
      </body>
    </html>
  );
}
