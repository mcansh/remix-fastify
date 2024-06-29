import { NavLink, Outlet } from "@remix-run/react";

let LINKS = [
  { to: "/", label: "Home" },
  { to: "/page-2", label: "Page 2" },
  { to: "/fetcher", label: "Fetcher" },
  { to: "loader-error", label: "Loader Error" },
  { to: "route-error", label: "Route Error" },
] as const;

export default function Layout() {
  return (
    <div>
      <header>
        <h1
          style={{
            background: `linear-gradient(to right, #ee33aa, rgb(79 70 229 / 1))`,
            fontSize: 36,
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Welcome to{" "}
          <a
            target="_blank"
            rel="noreferrer nofollow noopener"
            href="https://remix.run"
            style={{ borderBottom: "2px solid currentColor" }}
          >
            Remix
          </a>{" "}
          running on{" "}
          <a
            target="_blank"
            rel="noreferrer nofollow noopener"
            href="https://fastify.io"
            style={{ borderBottom: "2px solid currentColor" }}
          >
            Fastify
          </a>
        </h1>
        <nav>
          <ul
            style={{
              display: "flex",
              listStyle: "none",
              gap: "1rem",
              padding: 0,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  style={({ isActive }) => {
                    return {
                      color: isActive ? "red" : "blue",
                      textDecoration: isActive ? "underline" : "none",
                    };
                  }}
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
