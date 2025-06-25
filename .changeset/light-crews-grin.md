---
"@mcansh/remix-fastify": patch
---

allow passing options to childServer for use cases of other logging set ups

```
fastify.register(reactRouterFastify, {
  childServerOptions: { logLevel: 'silent' }
})
```
