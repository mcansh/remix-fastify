# @mcansh/remix-fastify

## 4.0.0

### Major Changes

- 3df5d21: feat: fastify v5 support

## 3.4.1

### Patch Changes

- 88e2ad1: fix asset serving when using a basename

## 3.4.0

### Minor Changes

- 6d074ed: return streams directly from remix to fastify

### Patch Changes

- 352c74f: New optional parameter to customize the `@fastify/static` plugin options. This can be useful to customize options like `decorateReply` or `setHeaders` to match your needs or when you already have a `@fastify/static` plugin registered.
- bd2a09c: New optional parameter to provide a custom server build for production. If not provided, it will be loaded using `import()` with the server build path provided in the options.

## 3.3.3

### Patch Changes

- be05e8b: The Remix Vite plugin allows you to customize the filename. This change allows you to pass a custom server file name to the Fastify plugin

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

## 3.3.2

### Patch Changes

- b83f33c: allows you to customize Vite dev server options. useful for reusing the fastify http(s) server for hmr in development
- 822b878: use file urls for esm for windows compatibility

## 3.3.1

### Patch Changes

- a7fcb6d: allows you to customize the cache control for both the files in the build directory as well as your public directory if you need to. using `pretty-cache-header` under the hood so things like `1y` or `30 days` will work

  ```js
  await app.register(remixFastify, {
    assetCacheControl: {},
    defaultCacheControl: {},
  });
  ```

- a7fcb6d: fix cache control so that build assets are immutable and cached for 1 year instead of everything being cached for 1 hour

## 3.3.0

### Minor Changes

- 597df2e: re-introduce plugin for easy configuration, we're still publicly exporting all the pieces, so you can still continue to configure your server as you do today.

  ```js
  import { remixFastify } from "@mcansh/remix-fastify";
  import { installGlobals } from "@remix-run/node";
  import { fastify } from "fastify";

  installGlobals();

  let app = fastify();

  await app.register(remixFastify);

  let port = Number(process.env.PORT) || 3000;

  let address = await app.listen({ port, host: "0.0.0.0" });
  console.log(`✅ app ready: ${address}`);
  ```

  and if you need to configure loadContext, you can do so like this:

  ```js
  import { remixFastify } from "@mcansh/remix-fastify";
  import { installGlobals } from "@remix-run/node";
  import { fastify } from "fastify";

  installGlobals();

  let app = fastify();

  await app.register(remixFastify, {
    getLoadContext(request, reply) {
      return {};
    },
  });

  let port = Number(process.env.PORT) || 3000;

  let address = await app.listen({ port, host: "0.0.0.0" });
  console.log(`✅ app ready: ${address}`);
  ```

### Patch Changes

- 90c6c61: changeset for #324

  bump dependencies to the latest versions

## 3.2.2

### Patch Changes

- 9300c22: feat: allow http2/https servers

  previously using `fastify({ http2: true })` or `fastify({ https: {...} })` resulted in type errors for the handler when passing the request
  ![image](https://github.com/mcansh/remix-fastify/assets/11698668/7a02b889-a9a9-4ddb-8686-ef6cda8d1bae)

  this has been fixed by passing the server type to all uses of the request and reply internally
  ![image](https://github.com/mcansh/remix-fastify/assets/11698668/ff23882b-c169-4b61-bc5f-90683c52fc1b)

  this PR allows any server that extends `http.Server | https.Server | http2.Http2Server | http2.Http2SecureServer;`

## 3.2.1

### Patch Changes

- d11803a: remove `criticalCss` option from createRequestHandler as it's now handled by the vite plugin in an agnostic way

## 3.2.0

### Minor Changes

- a5ee9f1: add support for inlining criticalCss when using the vite plugin

## 3.1.0

### Minor Changes

- f6793b4: remove `staticFilePlugin` wrapper around `@fastify/static` as the example is now configured properly to find new files without colliding with remix routes

### Patch Changes

- 8f3093e: update author info, add keywords and funding keys to package.json
- 25f00c3: bump dependencies to latest

## 3.0.2

### Patch Changes

- 9560ef1: fix: actually determind requested file
- 66ba8e5: move glob inside onRequest hook in order for getStaticFiles to be called. doing this allows the removal of node --watch which i totally didn't realize was restarting the server as we import the build 😅

## 3.0.1

### Patch Changes

- 1484ec4: Uses the normalized path for `filePublicPath`.

## 3.0.0

### Major Changes

- 40e8daa: remove plugin in favor of having server code in server. this allows live reload funcationally of `remix dev` to work

  you can find an example of the updated server code in [/example/server.js](/example/server.js)

### Minor Changes

- 40e8daa: remove references to fetch polyfills

## 2.8.1

### Patch Changes

- 4789835: add custom contentParser for json

  fastify automatically configures `application/json` which prevents fethcer.submit from working with json encoding

## 2.8.0

### Minor Changes

- 31c3507: feat: require explicit `installGlobals` call in server entry

  newer versions of node include `Request`, `Response`, `Headers`, `fetch`, etc globals

## 2.7.4

### Patch Changes

- b7e5567: chore: move @remix-run/router to deps, bump to latest

## 2.7.3

### Patch Changes

- c279e3a: return reply from response handler for async work (fastify/compression)

## 2.7.2

### Patch Changes

- ab24416: fix(plugin): return handler in production
- d92c468: automatically disable require cache purging when unstable_dev is truthy

## 2.7.1

### Patch Changes

- d3c16fb: feat: add support for early hints (HTTP 103)

## 2.7.0

### Minor Changes

- 31f5883: fix for post requests getting aborted

## 2.6.4

### Patch Changes

- c4bc305: Pass fastify-racing's AbortEvent on to AbortController

## 2.6.3

### Patch Changes

- 4f30f2a: ensure browserAssetUrl has a leading slash when it makes it to fastify

## 2.6.2

### Patch Changes

- 9337062: add leading slash to browserAssetUrl

## 2.6.1

### Patch Changes

- 4eef90e: fix: better windows file path support

## 2.6.0

### Minor Changes

- b52d31b: use tsup for building/bundling, no user facing changes

## 2.5.0

### Minor Changes

- 394c89c: Match static files in development based on the pathname to fix HMR.

## 2.4.1

### Patch Changes

- f3bdaa9: allow disabling purging of require cache

  useful when using the `future.unstable_dev` remix config flag

## 2.4.0

### Minor Changes

- e2b4224: Make Remix root directory location configurable.

## 2.3.1

### Patch Changes

- a581f54: Fix Fetch Request creation for incoming URLs with double slashes

## 2.3.0

### Minor Changes

- 9fd5b94: feat: Stream results to clients

  Instead of buffering the results and sending them down when they're all complete, instead we use a Passthrough stream to stream the chunks generated by Remix as we receive them.

## 2.2.1

### Patch Changes

- 342f8e9: fix: concat chunks for nested routes

## 2.2.0

### Minor Changes

- 805539b: properly use writeReadableStreamToWritable so that we use fastify's api for writing headers and the final response
