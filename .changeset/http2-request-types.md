---
"@mcansh/react-router-fastify": patch
---

Accept HTTP/2 Fastify requests and replies in `createRequest`, `createUrl`, `createRequestHandler`, and `sendResponse`, so apps using `fastify({ http2: true })` no longer need type casts
