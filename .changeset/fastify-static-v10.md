---
"@mcansh/react-router-fastify": major
---

Upgrade `@fastify/static` to v10 to fix GHSA-83w8-p2f5-377r, a route guard
bypass through `..` path segments.

`@fastify/static` v10 passes a `FastifyReply` to `staticOptions.setHeaders`
instead of a raw `ServerResponse`. If you pass your own `setHeaders`, call
`reply.header(name, value)` instead of `res.setHeader(name, value)`.
