import fastify from "fastify";
import { remixFastifyPlugin } from "@mcansh/remix-fastify";

import * as serverBuild from "./build/index.mjs";

let MODE = process.env.NODE_ENV;

let app = fastify();

await app.register(remixFastifyPlugin, {
  build: serverBuild,
  mode: MODE,
  getLoadContext: () => ({ loadContextName: "John Doe" }),
  purgeRequireCacheInDevelopment: false,
  unstable_earlyHints: true,
});

let port = process.env.PORT ? Number(process.env.PORT) || 3000 : 3000;

let address = await app.listen({ port, host: "0.0.0.0" });
console.log(`✅ app ready: ${address}`);

if (MODE === "development") {
  let { broadcastDevReady } = await import("@remix-run/node");
  broadcastDevReady(serverBuild);
}
