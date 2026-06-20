---
"@mcansh/remix-fastify": major
---

Replace the old server integration with a Web Fetch request/response adapter for React Router.

Fastify requests are now converted into Fetch `Request` objects with absolute URLs based on the original incoming URL, normalized headers, streamed request bodies for non-GET/HEAD requests, serialized parsed JSON bodies, and abort signals tied to the Fastify reply lifecycle.

React Router `Response` objects are now written back through Fastify with status, headers, streamed response bodies, bodyless responses, and multiple `Set-Cookie` headers preserved when the runtime exposes `Headers.getSetCookie()`.

`createRequestHandler` now accepts either a React Router server build or a build loader function, passes the configured mode through to React Router, and resolves `getLoadContext(request, reply)` for each request before handing control to React Router.
