import fastify from "fastify";
import * as serverBuild from "@remix-run/dev/server-build";
import { remixFastifyPlugin } from "@mcansh/remix-fastify";

let MODE = process.env.NODE_ENV;

async function start() {
  let app = fastify();

  await app.register(remixFastifyPlugin, {
    assetsBuildDirectory: serverBuild.assetsBuildDirectory,
    build: serverBuild,
    mode: MODE,
    publicPath: serverBuild.publicPath,
  });

  let port = process.env.PORT ? Number(process.env.PORT) : 3000;

  app
    .listen({ port, host: "0.0.0.0" })
    .then((address) => {
      console.log(`Fastify server listening at ${address}`);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
