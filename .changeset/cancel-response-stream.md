---
"@mcansh/react-router-fastify": patch
---

Cancel the response body stream when the client disconnects, so streamed responses such as server-sent events stop producing data and run their cleanup
