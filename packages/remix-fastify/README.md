# remix-fastify

`@mcansh/remix-fastify` runs a React Router framework app on Fastify in development and production. It provides a Fastify plugin for SSR/data requests and a Vite plugin so `react-router dev` can forward non-asset requests to your Fastify server.

## Features

- `reactRouterFastify` wires React Router request handling into Fastify.
- `fastifyDevServer` keeps one Fastify server entry across dev and production.
- `getLoadContext` passes request-scoped values into loaders/actions.
- Production static asset serving with configurable `Cache-Control` policies.
- Low-level adapters (`createReactRouterRequest`, `sendResponse`, etc.) for custom integrations.

## Installation

```sh
npm i remix
npm i @mcansh/remix-fastify fastify react-router @react-router/dev @react-router/node vite
```

## Usage

Use a single server entry that builds your Fastify app. In development, `fastifyDevServer` passes a Vite dev server so route changes hot-reload. In production, the same entry loads `build/server/index.js` and serves `build/client`.

```ts
// server.ts
import { fileURLToPath } from "node:url"
import { reactRouterFastify } from "@mcansh/remix-fastify"
import { fastify } from "fastify"

export async function createApp({ viteDevServer } = {}) {
  let app = fastify()

  app.get("/api/health", async () => ({ ok: true }))

  let build = viteDevServer
    ? () => viteDevServer.ssrLoadModule("virtual:react-router/server-build")
    : await import("./build/server/index.js")

  await app.register(
    reactRouterFastify({
      build,
      getLoadContext(request) {
        return { requestId: request.id }
      },
    }),
  )

  return app
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let app = await createApp()
  let address = await app.listen({ port: Number(process.env.PORT) || 3000 })
  console.log(`app ready: ${address}`)
}
```

```ts
// vite.config.ts
import { reactRouter } from "@react-router/dev/vite"
import { fastifyDevServer } from "@mcansh/remix-fastify/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [reactRouter(), fastifyDevServer({ entry: "./server.ts" })],
})
```

```json
{
  "scripts": {
    "dev": "react-router dev",
    "build": "react-router build",
    "start": "NODE_ENV=production node ./server.ts"
  }
}
```

## Development with `fastifyDevServer`

Use `fastifyDevServer` when you want Vite to own assets/HMR while Fastify handles API routes and SSR.

```ts
fastifyDevServer({
  entry: "./server.ts",
})
```

- `entry` is the path to your Fastify server entry.
- `entry` defaults to `"./server.ts"`.

## Request Context with `getLoadContext`

Use `getLoadContext` to pass values from Fastify into route loaders/actions.

```ts
await app.register(
  reactRouterFastify({
    build,
    getLoadContext(request, reply) {
      return {
        userId: request.headers["x-user-id"],
        traceId: reply.getHeader("x-trace-id"),
      }
    },
  }),
)
```

When React Router `v8_middleware` is enabled, return a `RouterContextProvider`:

```ts
import { RouterContextProvider } from "react-router"
import { userContext } from "./app/context"

await app.register(
  reactRouterFastify({
    build,
    getLoadContext() {
      let context = new RouterContextProvider()
      context.set(userContext, "host-server")
      return context
    },
  }),
)
```

## Static Assets and Cache Headers

In production, `reactRouterFastify` serves `<buildDirectory>/client` with `@fastify/static`. Configure long-lived caching for hashed assets and a shorter policy for other files.

```ts
await app.register(
  reactRouterFastify({
    build,
    assetCacheControl: { public: true, maxAge: 31_536_000, immutable: true },
    defaultCacheControl: { public: true, maxAge: 3_600 },
  }),
)
```

## Catch-All Route Options

Use `childServerOptions` to apply Fastify route options to the plugin catch-all handler.

```ts
await app.register(
  reactRouterFastify({
    build,
    childServerOptions: {
      config: {
        rateLimit: {
          max: 200,
          timeWindow: "1 minute",
        },
      },
    },
  }),
)
```

## Low-Level Server Utilities

If you need tighter control, the package also exports lower-level helpers to create `Request` objects, create handlers, and send `Response` objects.

```ts
import {
  createReactRouterRequest,
  sendResponse,
} from "@mcansh/remix-fastify"
import { createRequestHandler } from "react-router"

let build = await import("./build/server/index.js")
let handleRequest = createRequestHandler(build, process.env.NODE_ENV)

app.all("*", async (request, reply) => {
  let webRequest = createReactRouterRequest(request, reply)
  let webResponse = await handleRequest(webRequest)
  await sendResponse(reply, webResponse)
})
```

## Related Packages

- https://github.com/mcansh/remix-fastify/tree/main/packages/remix-fastify
- https://github.com/mcansh/remix-fastify/tree/main/examples/playground
- https://github.com/mcansh/remix-fastify/tree/main/examples/react-router

## Related Work

- [React Router](https://reactrouter.com)
- [Fastify](https://fastify.dev)
- [`@fastify/static`](https://github.com/fastify/fastify-static)
- [HTTP Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)

## License

MIT. See [LICENSE](https://github.com/mcansh/remix-fastify/blob/main/LICENSE).
