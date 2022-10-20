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
4. Instead of Express, instantiate a Fastify application, and register this plugin in it
   * The plugin needs to be passed the `BUILD_DIR` and `mode`
5. You can see an example of such a `server.js` in [`./example/server.js`](./example/server.js)

## Example

checkout the example usage in [./example/server.js](./example/server.js)
