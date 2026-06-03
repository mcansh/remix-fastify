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

Create a server entry that builds and exports a Fastify instance, then registers the plugin. Export the app so the dev plugin can import it, and only call `listen()` when running outside of Vite:

```ts
// server.js
import { getDevServer, reactRouterFastify } from "@mcansh/remix-fastify";
import { fastify } from "fastify";

export const app = fastify();

app.post("/api/echo", async (request, reply) => {
  reply.send(request.body);
});

await app.register(reactRouterFastify);

// In development the `fastifyDevServer` Vite plugin imports this module and
// drives the app itself, so we only start listening when run directly (e.g.
// `node server.js` in production).
if (!getDevServer()) {
  let address = await app.listen({ port: Number(process.env.PORT) || 3000 });
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

`fastifyDevServer` loads your server entry via Vite's `ssrLoadModule` and forwards requests to its exported Fastify instance. It accepts:

- `entry` — path to your server entry, relative to the project root. Default: `"./server.js"`.
- `export` — the named export of the Fastify instance. Default: `"app"`.

```ts
fastifyDevServer({ entry: "./server/index.ts", export: "app" });
```

Use `getDevServer()` in your server entry to detect whether you are running under the dev plugin (it returns the Vite dev server, otherwise `undefined`).

## Load context

Pass per-request values into your loaders and actions with `getLoadContext`:

```ts
await app.register(reactRouterFastify, {
  getLoadContext(request, reply) {
    return { userId: request.headers["x-user-id"] };
  },
});
```

When the `v8_middleware` future flag is enabled, return a `RouterContextProvider` instead:

```ts
import { RouterContextProvider } from "react-router";
import { userContext } from "./app/context";

await app.register(reactRouterFastify, {
  getLoadContext() {
    let context = new RouterContextProvider();
    context.set(userContext, "host-server");
    return context;
  },
});
```

## Options

`reactRouterFastify` accepts the following options (all optional):

- `basename` — base path for the app; match the `basename` in your React Router config. Default: `"/"`.
- `buildDirectory` — directory of the build output; match `buildDirectory` in your React Router config. Default: `"build"`.
- `serverBuildFile` — server build filename; match `serverBuildFile` in your React Router config. Default: `"index.js"`.
- `getLoadContext` — function returning the `context` passed to loaders and actions.
- `mode` — the React Router mode; defaults to `"development"` under the dev plugin, otherwise `process.env.NODE_ENV`.
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
