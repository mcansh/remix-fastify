# react-router

A minimal React Router v7 app served through Fastify with [`@mcansh/remix-fastify`](https://github.com/mcansh/remix-fastify). Development runs through `react-router dev` with `fastifyDevServer` booting the Fastify app from [`server.js`](./server.js).

## Development

```sh
npm run dev
```

`react-router dev` loads `server.js` through Vite, and `fastifyDevServer` (configured in [`vite.config.ts`](./vite.config.ts)) mounts the Fastify instance as the SSR catch-all while Vite handles HMR and assets.

## Production

Build, then run the same `server.js` directly:

```sh
npm run build
npm start
```

The build output lives in `build/server` and `build/client`.
