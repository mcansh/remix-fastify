# remix-fastify

A [Fastify](https://fastify.dev) plugin for [React Router](https://reactrouter.com) v7 framework mode, plus a companion Vite plugin so you can develop with `react-router dev` and your own Fastify server in the loop.

## Features

- Serve a React Router server build through Fastify, with your own routes, plugins, and hooks alongside it
- `react-router dev` for development: a Vite plugin boots your real Fastify app so custom routes work in dev exactly as they do in production
- Production static asset serving via `@fastify/static`, with sensible long-term caching for fingerprinted assets
- `getLoadContext` for passing values into your loaders and actions, including React Router middleware mode (`RouterContextProvider`)
- A lower-level `createRequestHandler` if you want to wire the request lifecycle up yourself

## Installation

```sh
npm i @mcansh/remix-fastify fastify react-router @react-router/node
```

For development with `react-router dev` you also need Vite and the React Router dev tooling:

```sh
npm i -D vite @react-router/dev
```

## Usage

Write your server as a factory that returns a configured Fastify instance. In development the Vite plugin imports this module and passes the Vite dev server in; in production the same module is run directly with `node`.

```js
// server.js
import { pathToFileURL } from "node:url";

import { reactRouterFastify } from "@mcansh/remix-fastify";
import { fastify } from "fastify";

/**
 * @param {import("vite").ViteDevServer} [vite]
 */
export async function app(vite) {
  let app = fastify();

  // your own routes and plugins live right alongside React Router
  app.post("/api/echo", async (request, reply) => {
    reply.send(request.body);
  });

  await app.register(reactRouterFastify, { vite });

  return app;
}

// Only listen when run directly (`node ./server.js`), not when the Vite dev
// server imports this module.
let isMain = import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  let server = await app();
  let address = await server.listen({ port: 3000, host: "0.0.0.0" });
  console.log(`app ready: ${address}`);
}
```

Add the Vite plugin so `react-router dev` runs your Fastify server:

```ts
// vite.config.ts
import { fastifyDevServer } from "@mcansh/remix-fastify/vite";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [reactRouter(), fastifyDevServer({ serverEntry: "./server.js" })],
});
```

Wire up your scripts:

```json
{
  "scripts": {
    "dev": "react-router dev",
    "build": "react-router build",
    "start": "cross-env NODE_ENV=production node ./server.js"
  }
}
```

## Development

`fastifyDevServer` is a Vite plugin that loads your server entry through Vite's SSR module loader and mounts the resulting Fastify instance as the SSR catch-all. Vite's own middleware still handles module, HMR, and asset requests, so HMR works as usual while your Fastify routes own everything else.

```ts
fastifyDevServer({
  // Path to your server entry, relative to the Vite root.
  serverEntry: "./server.js", // default "./server.ts"
  // The named export of your factory function. Falls back to the default export.
  exportName: "app", // default "app"
});
```

The plugin runs with `enforce: "pre"` so Fastify owns the request lifecycle regardless of where you place it in the `plugins` array. Edits to your server entry invalidate the cached app, so changes are picked up without a manual restart.

## getLoadContext

Pass values into your route `loader` and `action` functions with `getLoadContext`:

```js
await app.register(reactRouterFastify, {
  vite,
  getLoadContext(request, reply) {
    return { startTime: Date.now() };
  },
});
```

### Middleware mode

When [React Router middleware](https://reactrouter.com/how-to/middleware) is enabled, return a `RouterContextProvider` from `getLoadContext`:

```ts
import { unstable_RouterContextProvider } from "react-router";

await app.register(reactRouterFastify, {
  vite,
  getLoadContext(request, reply) {
    let context = new unstable_RouterContextProvider();
    context.set(someContext, someValue);
    return context;
  },
});
```

## Production

In production there is no Vite dev server. Run your server entry directly and the plugin imports the built server module and serves your client build:

```sh
react-router build
cross-env NODE_ENV=production node ./server.js
```

Fingerprinted assets under the build's `assets` directory are served with long-term immutable caching; other static files get a shorter default. Both are configurable.

## Options

`reactRouterFastify` accepts:

- `vite` — a Vite dev server. When provided the plugin runs in development mode. Supplied automatically by `fastifyDevServer`.
- `basename` — the base path for the app. Should match the `basename` in your Vite config. Default `"/"`.
- `buildDirectory` — the directory where the app is built. Should match your React Router config. Default `"build"`.
- `serverBuildFile` — the server build output filename. Should match your React Router config. Default `"index.js"`.
- `mode` — passed to the request handler. Default `process.env.NODE_ENV`.
- `getLoadContext` — returns the value used as `context` in loaders and actions.
- `assetCacheControl` — cache control for fingerprinted build assets in production. Default `{ public: true, maxAge: "1 year", immutable: true }`.
- `defaultCacheControl` — cache control for other static files in production. Default `{ public: true, maxAge: "1 hour" }`.
- `fastifyStaticOptions` — options forwarded to `@fastify/static`.
- `productionServerBuild` — a server build (or factory) to use in production instead of the default `import()` of the built file.
- `childServerOptions` — Fastify route options applied to the React Router catch-all route.

## Lower-level request handler

If you want to handle the request lifecycle yourself, use `createRequestHandler` directly:

```js
import { createRequestHandler } from "@mcansh/remix-fastify";

let handler = createRequestHandler({
  build: () => import("./build/server/index.js"),
  getLoadContext(request, reply) {
    return {};
  },
  mode: process.env.NODE_ENV,
});

app.all("*", handler);
```

## Examples

See the [`examples`](https://github.com/mcansh/remix-fastify/tree/main/examples) directory for runnable setups:

- [`react-router`](https://github.com/mcansh/remix-fastify/tree/main/examples/react-router) — a minimal `react-router dev` + `fastifyDevServer` setup
- [`playground`](https://github.com/mcansh/remix-fastify/tree/main/examples/playground) — the same setup plus a custom Fastify route and Tailwind

## Related Work

- [React Router](https://reactrouter.com)
- [Fastify](https://fastify.dev)
- [`@fastify/static`](https://github.com/fastify/fastify-static)

## License

See [LICENSE](https://github.com/mcansh/remix-fastify/blob/main/LICENSE.md)
