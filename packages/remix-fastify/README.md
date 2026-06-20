# remix-fastify

A Fastify adapter for React Router v8 framework mode, plus a Vite plugin so `react-router dev` runs through your Fastify server.

## Features

- Adapts Fastify requests and replies to React Router's Web Fetch request/response runtime
- Registers React Router as a Fastify catch-all route while preserving your own Fastify routes
- Loads `virtual:react-router/server-build` during development
- Serves `build/client` with `@fastify/static` in production
- Provides a Vite plugin that mounts your Fastify app during `react-router dev`
- Preserves shared server/app module identity for React Router context tokens

## Installation

```sh
npm i @mcansh/remix-fastify fastify react-router @react-router/node
npm i -D @react-router/dev vite
```

React Router v8 currently requires Node `>=22.22.0`.

## Usage

Create a server module that exports a factory. The factory receives the Vite dev server in development and `undefined` in production.

```ts
// server.ts
import { pathToFileURL } from "node:url"

import { fastifyReactRouter } from "@mcansh/remix-fastify"
import { fastify } from "fastify"
import type { ViteDevServer } from "vite"

export async function createServer(vite?: ViteDevServer) {
  let app = fastify()

  app.get("/api/health", async () => ({ ok: true }))

  await app.register(fastifyReactRouter, { devServer: vite })

  return app
}

let isMain = import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  let app = await createServer()
  await app.listen({ port: 3000, host: "0.0.0.0" })
}
```

Add the Vite plugin so `react-router dev` uses that Fastify server:

```ts
// vite.config.ts
import { reactRouter } from "@react-router/dev/vite"
import { fastifyReactRouterDev } from "@mcansh/remix-fastify/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [reactRouter(), fastifyReactRouterDev({ entry: "./server.ts" })],
})
```

Use the normal React Router commands:

```json
{
  "scripts": {
    "dev": "react-router dev",
    "build": "react-router build",
    "start": "NODE_ENV=production node ./server.js"
  }
}
```

## Example

A runnable example lives in `examples/basic`:

```sh
pnpm install
pnpm run example:dev
```

The example includes a Fastify API route at `/api/health`, `getLoadContext`
that seeds React Router context, root route middleware that updates that same
context, and a `vite.config.ts` that uses `fastifyReactRouterDev` with the
standard `react-router dev` command.

## Shared Context

React Router v8 uses `RouterContextProvider` for loaders, actions, and
middleware. When your Fastify server and React Router app both need the same
context token, put that token in a module that both sides import through the
same package import specifier.

Add a package import for the shared module:

```json
{
  "imports": {
    "#request-info": "./app/request-info.ts"
  }
}
```

Create the context token in your app:

```ts
// app/request-info.ts
import { createContext } from "react-router"

export interface RequestInfo {
  requestId: string
  userAgent: string
}

export let requestInfoContext = createContext<RequestInfo>()
```

Seed it from `getLoadContext`:

```ts
// server.ts
import { requestInfoContext } from "#request-info"
import { fastifyReactRouter } from "@mcansh/remix-fastify"
import { RouterContextProvider } from "react-router"

app.register(fastifyReactRouter, {
  devServer: vite,
  getLoadContext(request) {
    let context = new RouterContextProvider()
    context.set(requestInfoContext, {
      requestId: request.id,
      userAgent: request.headers["user-agent"] ?? "unknown",
    })
    return context
  },
})
```

Read or update the same context from React Router middleware and route modules:

```ts
// app/root.tsx
import { requestInfoContext } from "#request-info"
import type { MiddlewareFunction } from "react-router"

export const middleware: MiddlewareFunction[] = [
  async ({ context }, next) => {
    let requestInfo = context.get(requestInfoContext)
    context.set(requestInfoContext, requestInfo)
    return next()
  },
]
```

```ts
// app/routes/home.tsx
import { requestInfoContext } from "#request-info"
import type { LoaderFunctionArgs } from "react-router"

export async function loader({ context }: LoaderFunctionArgs) {
  return {
    requestInfo: context.get(requestInfoContext),
  }
}
```

Tell the Vite plugin to keep that package import external in React Router's SSR
build:

```ts
// vite.config.ts
import { reactRouter } from "@react-router/dev/vite"
import { fastifyReactRouterDev } from "@mcansh/remix-fastify/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [
    reactRouter(),
    fastifyReactRouterDev({
      entry: "./server.ts",
      externalizeServerEntryImports: ["#request-info"],
    }),
  ],
})
```

This prevents the production server bundle from inlining a second
`createContext()` instance. The built React Router server keeps
`import { requestInfoContext } from "#request-info"`, so `server.ts`,
middleware, and loaders all use the same token.

## Production

Without a Vite dev server, `fastifyReactRouter` imports `build/server/index.js` and serves static files from `build/client`:

```sh
react-router build
NODE_ENV=production node ./server.js
```

If your build output uses different paths, pass them directly:

```ts
await app.register(fastifyReactRouter, {
  serverBuildPath: "dist/server.js",
  clientBuildDirectory: "dist/client",
})
```

## API

`fastifyReactRouter` options:

- `devServer` - Vite dev server, provided by `fastifyReactRouterDev` during development
- `basePath` - URL base path for static files and the catch-all route, default `/`
- `serverBuildPath` - production server build module, default `build/server/index.js`
- `clientBuildDirectory` - production client asset directory, default `build/client`
- `mode` - value passed to React Router's request handler, default `process.env.NODE_ENV`
- `getLoadContext` - returns a `RouterContextProvider` for each request
- `build` - explicit React Router server build or build loader
- `staticOptions` - options forwarded to `@fastify/static`
- `assetCacheControl` - cache-control string for files under `<clientBuildDirectory>/assets`
- `fileCacheControl` - cache-control string for other files in `clientBuildDirectory`
- `routeOptions` - Fastify route options for the catch-all route

`fastifyReactRouterDev` options:

- `entry` - server module loaded by Vite, default `./server.ts`
- `exportName` - named server factory export, default `createServer`
- `externalizeServerEntryImports` - keeps local `#` and relative imports from
  the server entry external in the React Router SSR build; pass an explicit
  list such as `["#request-info"]` for tighter production packaging control.
  Externalized modules must be available to Node in production.

## Lower-level Handler

You can wire the route yourself with `createRequestHandler`:

```ts
import { createRequestHandler } from "@mcansh/remix-fastify"

app.all(
  "*",
  createRequestHandler({
    build: () => import("./build/server/index.js"),
  }),
)
```

## License

See [LICENSE](https://github.com/mcansh/remix-fastify/blob/main/LICENSE)
