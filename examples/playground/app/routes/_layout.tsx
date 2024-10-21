import { NavLink, Outlet } from "@remix-run/react";

let LINKS = [
  { to: "/", label: "Home" },
  { to: "/page-2", label: "Page 2" },
  { to: "/fetcher", label: "Fetcher" },
  { to: "loader-error", label: "Loader Error" },
  { to: "route-error", label: "Route Error" },
  {
    to: "resource-route-error",
    label: "Resource Route Loader Error",
    reloadDocument: true,
  },
] as const;

export default function Layout() {
  return (
    <div>
      <header>
        <h1 className="transparent text-fill-transparent bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text py-2 text-center text-4xl font-semibold">
          Welcome to{" "}
          <a
            target="_blank"
            rel="noreferrer nofollow noopener"
            href="https://remix.run"
            className="border-b-2"
          >
            Remix
          </a>{" "}
          running on{" "}
          <a
            target="_blank"
            rel="noreferrer nofollow noopener"
            href="https://fastify.io"
            className="border-b-2"
          >
            Fastify
          </a>
        </h1>
        <nav>
          <ul className="flex items-center justify-center gap-4 py-2">
            {LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  reloadDocument={
                    "reloadDocument" in link ? link.reloadDocument : false
                  }
                  className={({ isActive }) => {
                    return isActive
                      ? "text-red-500 underline underline-offset-2"
                      : "text-blue-500";
                  }}
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <div className="mt-4 mx-auto max-w-max space-y-4 text-center">
        <Outlet />
      </div>
    </div>
  );
}
