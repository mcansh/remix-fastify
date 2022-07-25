import fastify from "fastify";
import * as serverBuild from "@remix-run/dev/server-build";
import { remixFastifyPlugin } from "@mcansh/remix-fastify";

let MODE = process.env.NODE_ENV;

async function start() {
  let app = fastify();

  await app.register(remixFastifyPlugin, {
    build: serverBuild,
    mode: MODE,
  });

  let port = process.env.PORT ? Number(process.env.PORT) : 3000;

  app.listen({ port, host: "0.0.0.0" }, (error, address) => {
    if (error) {
      console.error(error);
      process.exit(1);
    }
    console.log(`Fastify server started at ${address}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
