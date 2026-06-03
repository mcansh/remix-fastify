# remix-fastify

Run a [React Router v7](https://reactrouter.com) (framework mode) app on [Fastify](https://fastify.io) — a request handler for production plus a Vite plugin that runs your Fastify server in development.

> The package is named `@mcansh/remix-fastify` for continuity with its Remix origins, but it now targets React Router v7 only.

## Features

- `reactRouterFastify` — a Fastify plugin that serves your React Router app, handling SSR, data requests, and (in production) static assets.
- `fastifyDevServer` — a Vite plugin that runs your own Fastify instance in development behind Vite's asset/HMR middleware, so dev and production share one server entry.
- `getLoadContext` for passing per-request values from Fastify into your loaders and actions, including `RouterContextProvider` support when the `v8_middleware` future flag is enabled.
- Configurable `Cache-Control` for build assets and other static files.

## Installation

```sh
npm i @mcansh/remix-fastify fastify react-router @react-router/node
```

`vite` is required to use the development plugin (it is already a dependency of any React Router framework app):

```sh
npm i -D vite
```

## Usage

Create a server entry that exports a `createApp({ viteDevServer })` factory which builds a Fastify instance and registers the plugin. The dev plugin calls this factory with the Vite dev server; in production you call it yourself and `listen()`:

```ts
// server.js
import { fileURLToPath } from "node:url";
import { reactRouterFastify } from "@mcansh/remix-fastify";
import { fastify } from "fastify";

export async function createApp({ viteDevServer } = {}) {
  const app = fastify();

  app.post("/api/echo", async (request, reply) => {
    reply.send(request.body);
  });

  await app.register(reactRouterFastify({ viteDevServer }));

  return app;
}

// In development the `fastifyDevServer` Vite plugin imports this module and
// calls `createApp` with the Vite dev server. Only start listening when run
// directly (e.g. `node server.js` in production), which is what this check
// detects — under the dev plugin the module is imported, not executed.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = await createApp();
  const address = await app.listen({ port: Number(process.env.PORT) || 3000 });
  console.log(`app ready: ${address}`);
}
```

Add the Vite plugin alongside `reactRouter()`:

```ts
// vite.config.ts
import { reactRouter } from "@react-router/dev/vite";
import { fastifyDevServer } from "@mcansh/remix-fastify/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [reactRouter(), fastifyDevServer({ entry: "./server.js" })],
});
```

Wire up your scripts to React Router's CLI for dev/build and run the server entry directly in production:

```json
{
  "scripts": {
    "dev": "react-router dev",
    "build": "react-router build",
    "start": "cross-env NODE_ENV=production node ./server.js"
  }
}
```

`react-router dev` now serves client assets and HMR through Vite, then forwards every other request to your Fastify app.

## Development plugin

`fastifyDevServer` loads your server entry via Vite's `ssrLoadModule` and calls its exported factory with the Vite dev server, then forwards requests to the returned Fastify instance. It accepts:

- `entry` — path to your server entry, relative to the project root. Default: `"./server.js"`.
- `export` — the named export of the `createApp` factory. Default: `"createApp"`.

```ts
fastifyDevServer({ entry: "./server/index.ts", export: "createApp" });
```

The factory receives `{ viteDevServer }`; forward it to `reactRouterFastify` so the plugin renders through Vite (with HMR) in development. There is no global state — the dev server is passed explicitly.

## Load context

Pass per-request values into your loaders and actions with `getLoadContext`:

```ts
await app.register(
  reactRouterFastify({
    getLoadContext(request, reply) {
      return { userId: request.headers["x-user-id"] };
    },
  }),
);
```

`reactRouterFastify` is a plugin factory: call it with your options and register the result. `getLoadContext`'s `request`/`reply` are typed for `http.Server` by default; pass a type argument to target another server, e.g. `reactRouterFastify<Http2Server>({ ... })`.

When the `v8_middleware` future flag is enabled, return a `RouterContextProvider` instead:

```ts
import { RouterContextProvider } from "react-router";
import { userContext } from "./app/context";

await app.register(
  reactRouterFastify({
    getLoadContext() {
      let context = new RouterContextProvider();
      context.set(userContext, "host-server");
      return context;
    },
  }),
);
```

## Options

`reactRouterFastify` accepts the following options (all optional):

- `basename` — base path for the app; match the `basename` in your React Router config. Default: `"/"`.
- `buildDirectory` — directory of the build output; match `buildDirectory` in your React Router config. Default: `"build"`.
- `serverBuildFile` — server build filename; match `serverBuildFile` in your React Router config. Default: `"index.js"`.
- `getLoadContext` — function returning the `context` passed to loaders and actions.
- `mode` — the React Router mode; defaults to `"development"` when a `viteDevServer` is provided, otherwise `process.env.NODE_ENV`.
- `viteDevServer` — the Vite dev server, forwarded from your `createApp` factory in development. When set, SSR runs through Vite and static asset serving is skipped (Vite serves assets/HMR). Leave unset in production.
- `fastifyStaticOptions` — options forwarded to [`@fastify/static`](https://github.com/fastify/fastify-static) for serving compiled assets in production.
- `assetCacheControl` — `Cache-Control` for hashed build assets, via [`pretty-cache-header`](https://github.com/cdimascio/pretty-cache-header). Default: `{ public: true, maxAge: "1 year", immutable: true }`.
- `defaultCacheControl` — `Cache-Control` for other static files. Default: `{ public: true, maxAge: "1 hour" }`.
- `productionServerBuild` — provide the server build directly instead of importing it from `buildDirectory`.
- `childServerOptions` — Fastify [route options](https://fastify.dev/docs/latest/Reference/Routes/#routes-options) applied to the catch-all route.

## Examples

- [`examples/playground`](https://github.com/mcansh/remix-fastify/tree/main/examples/playground) — full app using the Vite dev plugin and `RouterContextProvider` load context.
- [`examples/react-router`](https://github.com/mcansh/remix-fastify/tree/main/examples/react-router) — minimal React Router + Fastify setup.

## Related Work

- [React Router](https://reactrouter.com)
- [Fastify](https://fastify.io)
- [react-router-fastify](https://github.com/simonsmith/react-router-fastify) — an alternative React Router 7 + Fastify boilerplate.

## License

MIT. See [LICENSE](https://github.com/mcansh/remix-fastify/blob/main/LICENSE).
