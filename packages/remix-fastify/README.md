# remix-fastify

`@mcansh/remix-fastify` has moved to `@mcansh/react-router-fastify`.

Install the new package and update imports:

```sh
npm i @mcansh/react-router-fastify fastify react-router @react-router/node
npm uninstall @mcansh/remix-fastify
```

```ts
import { fastifyReactRouter } from "@mcansh/react-router-fastify"
import { fastifyReactRouterDev } from "@mcansh/react-router-fastify/vite"
```

Version 5 of `@mcansh/remix-fastify` is only a compatibility bridge that
re-exports `@mcansh/react-router-fastify` for existing imports.
