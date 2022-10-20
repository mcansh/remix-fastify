const fastify = require("fastify");
const path = require("path");
const { remixFastifyPlugin } = require("@mcansh/remix-fastify");

let BUILD_DIR = path.join(process.cwd(), "build");
let MODE = process.env.NODE_ENV;

async function start() {
  let app = fastify();

  app.register(remixFastifyPlugin, {
    build: BUILD_DIR,
    mode: MODE,
  });

  let address = await app.listen({ port: Number(process.env.PORT || 3000), host: "0.0.0.0" });

  console.log(`Fastify server listening at ${address}`);
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
