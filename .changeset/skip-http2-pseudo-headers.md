---
"@mcansh/react-router-fastify": patch
---

Skip HTTP/2 pseudo headers such as `:method` when building the Fetch request, so apps using `fastify({ http2: true })` no longer fail with an invalid header name error
