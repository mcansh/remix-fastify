---
"@mcansh/remix-fastify": major
---

Drop Remix support — target React Router v7 only

**Breaking changes:**

- Removed all Remix support. The package now targets React Router v7 (framework mode) exclusively. `@remix-run/node` is no longer a peer dependency.
- `remixFastify` is removed. Use `reactRouterFastify` instead.
- The package is now ESM-only. The CommonJS (`.cjs`) builds and the prebuilt `react-router.*` / `middleware.*` subpath shim files have been removed.
- Exports were restructured. Import the plugin and helpers from `@mcansh/remix-fastify` (or the `/react-router`, `/middleware`, `/vite` subpaths). The previous `source`/`main`/`module`/`types` fields are gone in favor of the `exports` map.

**New features:**

- Added `fastifyDevServer`, a Vite plugin (`@mcansh/remix-fastify/vite`) that runs your own Fastify instance in development behind Vite's asset/HMR middleware, so dev and production share a single server entry.
- Added `getDevServer()` so your server entry can detect when it is running under the dev plugin (e.g. to only call `app.listen()` in production).
- `getLoadContext` now supports returning a `RouterContextProvider` when the `v8_middleware` future flag is enabled.

The examples were consolidated to `playground` (migrated to the Vite dev plugin) and `react-router`, and the READMEs were rewritten for the new API.
