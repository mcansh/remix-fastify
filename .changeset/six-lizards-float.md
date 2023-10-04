---
"@mcansh/remix-fastify": patch
---

move glob inside onRequest hook in order for getStaticFiles to be called. doing this allows the removal of node --watch which i totally didn't realize was restarting the server as we import the build 😅
