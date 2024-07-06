---
"@mcansh/remix-fastify": patch
---

The Remix Vite plugin allows you to customize the filename. This change allows you to pass a custom server file name to the Fastify plugin

```js vite.config.ts
export default defineConfig({
  plugins: [remix({ serverFilename: "example.js" })],
});
```

```js server.js
await app.register(remixFastify, {
  serverFilename: "example.js",
});
```
