import { NavLink, Outlet } from "@remix-run/react";

let LINKS = [
  { to: "/", label: "Home" },
  { to: "/page-2", label: "Page 2" },
  { to: "/fetcher", label: "Fetcher" },
  { to: "loader-error", label: "Loader Error" },
  { to: "route-error", label: "Route Error" },
  { to: "resource-route-error", label: "Respurce Route Loader Error" },
] as const;

export default function Layout() {
  return (
    <div>
      <header>
        <h1 className="bg-clip-text text-4xl transparent bg-gradient-to-r from-pink-500 to-purple-500 text-fill-transparent font-semibold text-center py-2">
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
          <ul className="flex gap-4 justify-center items-center py-2">
            {LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
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


      <div className="mx-auto max-w-max text-center space-y-4 mt-4">
	      <Outlet />
      </div>
    </div>
  );
}
