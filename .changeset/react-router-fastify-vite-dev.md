---
"@mcansh/remix-fastify": major
---

Add the `@mcansh/remix-fastify/vite` entry point with `fastifyReactRouterDev`.

The Vite plugin lets `react-router dev` run through the app's own Fastify server instead of a separate manual server process. It loads a configurable server entry, calls the configured factory export, waits for `app.ready()`, and mounts Fastify after Vite's own middleware so Vite internals and HMR continue to run first.

The plugin also closes and reloads the Fastify app when watched files change or unlink, and when the Vite HTTP server closes. SSR module loading uses Vite's environment runner when available and falls back to `ssrLoadModule` for older Vite server shapes.

For production builds, `fastifyReactRouterDev` can keep local and `#` imports from the server entry external in the React Router SSR build. This preserves singleton module identity for shared values such as React Router context tokens used by `getLoadContext`, middleware, and route loaders.
