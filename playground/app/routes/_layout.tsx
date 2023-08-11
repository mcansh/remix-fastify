import { Outlet } from "@remix-run/react";

export default function Layout() {
  return (
    <div>
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
      <Outlet />
    </div>
  );
}
