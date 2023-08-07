import fastify from "fastify";
import { remixFastifyPlugin } from "@mcansh/remix-fastify";
import { installGlobals } from "@remix-run/node";
import sourceMapSupport from "source-map-support";

sourceMapSupport.install();
installGlobals();

let app = fastify();

await app.register(remixFastifyPlugin, {
  build: "./build/index.mjs",
  mode: process.env.NODE_ENV,
  getLoadContext: () => ({ loadContextName: "John Doe" }),
  unstable_earlyHints: true,
});

let port = Number(process.env.PORT) || 3000;

let address = await app.listen({ port, host: "0.0.0.0" });
console.log(`✅ app ready: ${address}`);

if (process.env.NODE_ENV === "development") {
  let { broadcastDevReady } = await import("@remix-run/node");
  broadcastDevReady(serverBuild);
}
