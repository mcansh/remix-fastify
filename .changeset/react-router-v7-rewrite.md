---
"@mcansh/remix-fastify": major
---

Rewrite as a React Router v7 Fastify + Vite plugin

Drops all Remix support and rebuilds the package around React Router v7 framework mode. Adds the `reactRouterFastify` Fastify plugin, a `createRequestHandler` web-fetch adapter, and a `fastifyDevServer` Vite plugin (exported at `@mcansh/remix-fastify/vite`) that boots your own Fastify server under `react-router dev`.

BREAKING CHANGE: removes the Remix entry points and the `./middleware` and `./react-router` exports. React Router v7 is now required, and the package is ESM-only.
