---
"@mcansh/remix-fastify": minor
---

re-introduce plugin for easy configuration, we're still publicly exporting all the pieces, so you can still continue to configure your server as you do today.

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
