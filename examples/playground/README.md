# playground

A React Router v7 app served through Fastify with [`@mcansh/remix-fastify`](https://github.com/mcansh/remix-fastify), used as a working sandbox for the package. On top of the basic setup it adds a custom Fastify route (`POST /api/echo`) and Tailwind, to exercise running your own routes alongside React Router.

## Development

```sh
npm run dev
```

`react-router dev` loads [`server.js`](./server.js) through Vite, and `fastifyDevServer` (configured in [`vite.config.ts`](./vite.config.ts)) mounts the Fastify instance as the SSR catch-all. The custom `POST /api/echo` route is served by Fastify in dev just as it is in production:

```sh
curl -X POST localhost:3000/api/echo \
  -H "content-type: application/json" \
  -d '{"hello":"world"}'
```

## Production

Build, then run the same `server.js` directly:

```sh
npm run build
npm start
```

The build output lives in `build/server` and `build/client`.
