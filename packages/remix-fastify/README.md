# Remix Fastify

Use [Remix](https://remix.run) with [Fastify](http://fastify.io)

## Quick Start

These are the currently available templates that you can get jump started with:

- Using the Remix Vite plugin (recommended)

  ```sh
  npx create-remix@latest --template mcansh/remix-fastify/examples/vite
  ```

- The basic example using the old Remix compiler
  ```sh
  npx create-remix@latest --template mcansh/remix-fastify/examples/basic
  ```

## Add to existing remix vite app

### Install dependencies

```shell
pnpm add @mcansh/remix-fastify fastify source-map-support get-port chalk @fastify/{middie,static}
```

### Install dev dependencies

```shell
pnpm add -D @types/source-map-support tsx
```

in the root of your project create a server directory and add index.ts
`server/index.ts`

```ts
import process from "node:process";
import { remixFastify } from "@mcansh/remix-fastify";
import chalk from "chalk";
import { fastify } from "fastify";
import sourceMapSupport from "source-map-support";
import getPort, { portNumbers } from "get-port";

sourceMapSupport.install();

const app = fastify();

await app.register(remixFastify);

const host = process.env.HOST || "127.0.0.1";
const desiredPort = Number(process.env.PORT) || 3000;
const portToUse = await getPort({
  port: portNumbers(desiredPort, desiredPort + 100),
});

let address = await app.listen({ port: portToUse, host });
let { port: usedPort } = new URL(address);

if (usedPort !== String(desiredPort)) {
  console.warn(
    chalk.yellow(
      `⚠️ Port ${desiredPort} is not available, using ${usedPort} instead.`,
    ),
  );
}

console.log(chalk.green(`✅ app ready: ${address}`));
```

Update the `package.json` dev, start and build commands

```json
"build": "remix vite:build && tsc --project ./tsconfig.server.json",
"dev": "cross-env NODE_ENV=development tsx --watch-path ./server/index.ts ./server/index.ts",
"start": "cross-env NODE_ENV=production node ./server/index.js",
```

Add the `tsconfig.server.json` file to the root of the project

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./tsconfig.json",
  "include": ["./server/**/*.ts"],
  "exclude": ["node_modules"],
  "compilerOptions": {
    "noEmit": false,
    "outDir": "./server"
  }
}
```

run `pnpm dev` to test that the server starts
