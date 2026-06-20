---
"@mcansh/remix-fastify": major
---

Rebuild the package as a React Router 8 framework-mode Fastify adapter.

This is a breaking rewrite of the public API and package shape. The Remix-focused adapter APIs have been removed:

- Removed `remixFastify` and Remix request-handler support.
- Removed the `@mcansh/remix-fastify/middleware` and `@mcansh/remix-fastify/react-router` subpath exports.
- Removed the generated CommonJS proxy files for those subpaths.
- Removed CommonJS package output. The package is now ESM-only and publishes `./dist/index.mjs` plus `./dist/vite.mjs`.
- React Router 8, `@react-router/node` 8, Fastify 5, and Node `>=22.22.0` are now required.

The main export now provides `fastifyReactRouter`, `createRequestHandler`, lower-level request/response adapter helpers (`createHeaders`, `createRequest`, `createUrl`, and `sendResponse`), and the related public types.

`fastifyReactRouter` registers React Router as a Fastify catch-all route while preserving Fastify routes that were registered first. In development it loads `virtual:react-router/server-build` from Vite; in production it imports `build/server/index.js` by default and serves `build/client` with `@fastify/static`.

The production static-file handler now supports separate cache controls for immutable build assets and other client files through `assetCacheControl` and `fileCacheControl`. The catch-all route can also receive Fastify `routeOptions`.
