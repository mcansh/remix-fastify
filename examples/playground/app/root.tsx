import { json } from "@remix-run/node";
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
  return json({ message: "Hello from the root loader" });
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
        <div className="bg-red-700 border-2 border-black text-white p-4 max-w-max mx-auto">
          {data.message}
        </div>
        <Outlet />
        <Scripts />
        <ScrollRestoration />
      </body>
    </html>
  );
}
