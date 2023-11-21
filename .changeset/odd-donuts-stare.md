---
"@mcansh/remix-fastify": patch
---

bundle with tshy instead of tsup allowing `declarationMap` along with a few other options to be enabled in the tsconfig, however this does break deep imports if you were using them, but that's non public api
