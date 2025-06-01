---
"@mcansh/remix-fastify": minor
---

remove index re-export, point main to ./remix

before this PR, both `.` (bare import) and `./remix` (sub path import) would both be generated, now only the bare import is available.
