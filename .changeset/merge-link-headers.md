---
"@mcansh/react-router-fastify": patch
---

Append `Link` headers from React Router responses to `Link` headers already set on the Fastify reply instead of replacing them. Other headers still replace existing values.
