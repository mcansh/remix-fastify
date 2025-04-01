import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import type { LinksFunction, unstable_MiddlewareFunction } from "react-router";
import "./app.css";
import type { Route } from "./+types/root";
import { adapterContext } from "../context";

export function loader({ context }: Route.LoaderArgs) {
  console.log({ context: context.get(adapterContext) });
}

export const unstable_middleware: unstable_MiddlewareFunction[] = [
  async ({ context }) => {
    const adapterContextValue = context.get(adapterContext);
    console.log({ adapterContextValue });
    context.set(adapterContext, { session: "updated" });
  },
];

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
