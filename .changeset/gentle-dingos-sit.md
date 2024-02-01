---
"@mcansh/remix-fastify": patch
---

feat: allow http2/https servers

previously using `fastify({ http2: true })` or `fastify({ https: {...} })` resulted in type errors for the handler when passing the request
![image](https://github.com/mcansh/remix-fastify/assets/11698668/7a02b889-a9a9-4ddb-8686-ef6cda8d1bae)

this has been fixed by passing the server type to all uses of the request and reply internally
![image](https://github.com/mcansh/remix-fastify/assets/11698668/ff23882b-c169-4b61-bc5f-90683c52fc1b)

this PR allows any server that extends `http.Server | https.Server | http2.Http2Server | http2.Http2SecureServer;`
