import {
  data,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import type { Route } from "./+types/root";
import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";
import "./styles/global.css";

export function loader() {
  return data({ message: "Hello from the root loader" });
}

const clientLogger: Route.ClientMiddlewareFunction = async (
  { request },
  next,
) => {
  let start = performance.now();

  // Run the remaining middlewares and all route loaders
  await next();

  let duration = performance.now() - start;
  console.log(`Navigated to ${request.url} (${duration}ms)`);
};

const serverLogger: Route.MiddlewareFunction = async (
  { request },
  next,
) => {
  let start = performance.now();

  // 👇 Grab the response here
  let res = await next();

  let duration = performance.now() - start;
  console.log(`Navigated to ${request.url} (${duration}ms)`);

  // 👇 And return it here (optional if you don't modify the response)
  return res;
};

export const middleware = [serverLogger];
export const clientMiddleware = [clientLogger];

export default function App({ loaderData }: Route.ComponentProps) {
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
        <Alert className="mx-auto max-w-sm" variant="destructive">
          <AlertTitle>Heads up!</AlertTitle>
          <AlertDescription>{loaderData.message}</AlertDescription>
        </Alert>

        <Outlet />
        <Scripts />
        <ScrollRestoration />
      </body>
    </html>
  );
}
