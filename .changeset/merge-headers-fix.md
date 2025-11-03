---
"@mcansh/remix-fastify": patch
---

Merge headers set by Fastify with headers from Remix instead of overriding them. This fixes an issue where headers like `Link` set by Fastify before calling the Remix handler were being overridden by headers from the Remix response.
