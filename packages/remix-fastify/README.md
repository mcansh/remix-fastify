# Remix Fastify

Use [Remix](https://remix.run) with [Fastify](http://fastify.io)

## Installation

```sh
npm i @mcansh/remix-fastify fastify
```

## Quick Start

1. `npx create-remix@latest --template https://github.com/mcansh/remix-fastify/tree/main/example`

> **Note**
>
> on Windows, you may need to manually call `installGlobals()` inside server.ts

> ```ts
> import fastify from "fastify";
> import { remixFastifyPlugin } from "@mcansh/remix-fastify";
> import { installGlobals } from "@remix-run/node";
> installGlobals();
> // rest of your server code
> ```

## Example

checkout the example usage in [./example/server.ts](./example)
