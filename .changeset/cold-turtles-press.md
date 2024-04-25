---
"@mcansh/remix-fastify": patch
"basic-example-template": patch
---

allows you to customize the cache control for both the files in the build directory as well as your public directory if you need to. using `pretty-cache-header` under the hood so things like `1y` or `30 days` will work

```js
await app.register(remixFastify, {
  assetCacheControl: {},
  defaultCacheControl: {},
});
```
