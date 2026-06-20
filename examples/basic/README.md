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
