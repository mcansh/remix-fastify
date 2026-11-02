# Basic Example

This app uses `@mcansh/react-router-fastify` with React Router framework mode
and a custom Fastify server.

From the repository root:

```sh
pnpm install
pnpm --dir examples/basic dev
```

The `dev` script runs `react-router dev`. The adapter's Vite plugin loads
`server.ts`, mounts the Fastify app, and lets Fastify handle application
requests after Vite's own development middleware.

The app shares `requestInfoContext` through the `#request-info` package import.
`getLoadContext` sets that context from Fastify request data, and root route
middleware updates the same value before the route loader reads it.

Useful routes:

- `/` - React Router route with loader data from `getLoadContext` and middleware
- `/about` - second React Router route
- `/api/health` - plain Fastify API route registered before the catch-all

## Report production errors

`@sentry/node` is a dependency of this example. The published package
`@mcansh/react-router-fastify` has no Sentry dependency.

Set `SENTRY_DSN` in the environment for `pnpm run start`. Keep the value of
`SENTRY_DSN` out of files in the repo.

`pnpm run start` runs `node --import ./instrument.ts ./server.ts`.
`instrument.ts` reads `SENTRY_DSN` and trims it.

If `SENTRY_DSN` is unset or blank after that trim, `instrument.ts` returns
without calling `Sentry.init`.

When the trimmed value is non-empty, `instrument.ts` calls `Sentry.init` with
`tracesSampleRate` set to `0`.

The process reports these failures.

- A crash of the Node process, including an uncaught exception while Node
  loads `server.ts`.
- A throw from a Fastify route.

A React Router error response is not reported. React Router handles that
error inside the catch-all. Fastify receives no throw for that error.

`pnpm dev` does not pass `--import`. The dev server does not send events.

To enable reporting from your machine, run `pnpm --dir examples/basic build`.
Set `SENTRY_DSN` in your shell. Run `pnpm --dir examples/basic start`.
