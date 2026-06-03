---
"@mcansh/remix-fastify": major
---

Drop Remix support — target React Router v7 only

**Breaking changes:**

- Removed all Remix support. The package now targets React Router v7 (framework mode) exclusively. `@remix-run/node` is no longer a peer dependency.
- `remixFastify` is removed. Use `reactRouterFastify` instead.
- The package is now ESM-only. The CommonJS (`.cjs`) builds and the prebuilt `react-router.*` / `middleware.*` subpath shim files have been removed.
- Exports were restructured to two entry points: the plugin and helpers from `@mcansh/remix-fastify`, and the Vite plugin from `@mcansh/remix-fastify/vite`. The previous `/react-router` and `/middleware` subpaths and the `source`/`main`/`module`/`types` fields are gone in favor of the `exports` map.
- `reactRouterFastify` is now a plugin factory: call it with your options and register the result — `app.register(reactRouterFastify({ ... }))` instead of `app.register(reactRouterFastify, { ... })`. This makes `getLoadContext` typed for your server (`reactRouterFastify<Http2Server>({ ... })` to target another).

**New features:**

- Added `fastifyDevServer`, a Vite plugin (`@mcansh/remix-fastify/vite`) that runs your own Fastify instance in development behind Vite's asset/HMR middleware, so dev and production share a single server entry.
- Your server entry exports a `createApp({ viteDevServer })` factory. The dev plugin passes the Vite dev server explicitly (no global state), and production runs the entry directly — gate `app.listen()` with `process.argv[1] === fileURLToPath(import.meta.url)`.
- `getLoadContext` now supports returning a `RouterContextProvider` when the `v8_middleware` future flag is enabled.
- The dev plugin auto-externalizes modules shared between your server entry and your app (e.g. a `createContext` token module) from the production SSR build, so context tokens keep a single identity across both — no manual `rollupOptions.external` needed. Pass `buildDirectory` to match a non-default React Router build directory.

The examples were consolidated to `playground` (migrated to the Vite dev plugin) and `react-router`, and the READMEs were rewritten for the new API.
