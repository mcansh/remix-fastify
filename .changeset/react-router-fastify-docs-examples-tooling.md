---
"@mcansh/remix-fastify": major
---

Refresh the docs, example app, tests, and build tooling around the React Router rewrite.

The package README now documents the Fastify server factory pattern, `react-router dev`, production build/start commands, `fastifyReactRouter` options, the lower-level handler API, and React Router 8 `RouterContextProvider` usage.

The examples have been consolidated to a single `examples/basic` app that demonstrates React Router framework mode, a custom Fastify server, a Fastify API route beside the React Router catch-all, `fastifyReactRouterDev`, and shared context tokens through a `#request-info` package import. The old Remix template version of the basic app, the separate Vite Remix example, the playground, and the standalone React Router example were removed or replaced.

The package test suite was rewritten around the new adapter surface, covering request/header/body conversion, response streaming and cookies, load context propagation, static-file cache headers, Vite SSR module loading, and dev-plugin import externalization.

The workspace now builds with `tsdown` as an ESM-only package with generated declarations, `publint`, and the ESM `attw` profile. Project tooling moved from ESLint and Prettier to `oxlint` and `oxfmt`, the changeset helper scripts were migrated to TypeScript files, CI/package-preview checks were simplified, and old Remix workspace overrides and deployment targets were removed.
