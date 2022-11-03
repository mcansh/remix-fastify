# Remix Fastify

Use [Remix](https://remix.run) with [Fastify](http://fastify.io)

## Installation

```sh
npm i @mcansh/remix-fastify
yarn add @mcansh/remix-fastify
pnpm i @mcansh/remix-fastify
```

## Quick Start

1. `npx create-remix@latest --template express`
2. [install](#installation) this
3. remove `compression`, `express`, `morgan`, `nodemon`
4. update your `server.js` with the following [./example/server.js](./example/server.js)

> **Note**
>
> on windows, you may need to manually call `installGlobals()` inside server.ts

> ```ts
> import fastify from "fastify";
> import { remixFastifyPlugin } from "@mcansh/remix-fastify";
> import { installGlobals } from "@remix-run/node";
> installGlobals();
> // rest of your server code
> ```

## Example

checkout the example usage in [./example/server.ts](./example)
