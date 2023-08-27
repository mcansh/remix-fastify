---
"@mcansh/remix-fastify": patch
"remix-app-template": patch
---

add custom contentParser for json 

fastify automatically configures `application/json` which prevents fethcer.submit from working with json encoding
