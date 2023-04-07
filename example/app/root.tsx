import type { LinksFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";

import stylesUrl from "./styles/global.css";

export let links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

export function loader() {
  return json({ message: "Hello world!" });
}

export default function App() {
  let data = useLoaderData<typeof loader>();
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
        <Outlet />
        <Scripts />
        <ScrollRestoration />
        <LiveReload />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            right: 0,
            transform: "translate3d(-50%, 0, 0)",
            paddingBottom: 20,
            textAlign: "center",
            width: "max-content",
          }}
        >
          {data.message}
        </div>
      </body>
    </html>
  );
}
