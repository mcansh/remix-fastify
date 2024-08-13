---
"@mcansh/remix-fastify": patch
---

New optional parameter to provide a custom server build for production. If not provided, it will be loaded using `import()` with the server build path provided in the options.
