# Remix Fastify

Use [Remix](https://remix.run) with [Fastify](http://fastify.io)

## Installation

```sh
npm i @mcansh/remix-fastify fastify
```

## Quick Start

```sh
npx create-remix@latest --template https://github.com/mcansh/remix-fastify/tree/main/example
```

## Usage

The easiest way to integrate this into your project is with the `remixFastifyPlugin` exported from this package

```js
import fastify from "fastify";
import { remixFastifyPlugin } from "@mcansh/remix-fastify";
import { installGlobals } from "@remix-run/node";

import * as serverBuild from "./build/index.js";

installGlobals();

let MODE = process.env.NODE_ENV;

let app = fastify();

await app.register(remixFastifyPlugin, {
  build: serverBuild,
  mode: process.env.NODE_ENV,
});

let port = Number(process.env.PORT) || 3000;

let address = await app.listen({ port, host: "0.0.0.0" });
console.log(`✅ app ready: ${address}`);

if (process.env.NODE_ENV === "development") {
  let { broadcastDevReady } = await import("@remix-run/node");
  broadcastDevReady(serverBuild);
}
```

## Example

checkout the example usage in [./example/server.mjs](./example/server.mjs)
