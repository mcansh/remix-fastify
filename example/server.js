let path = require("node:path");
let fastify = require("fastify");
let { remixFastifyPlugin } = require("@mcansh/remix-fastify");

let MODE = process.env.NODE_ENV;

let BUILD = path.join(process.cwd(), "build", "index.js");

async function start() {
  let app = fastify();

  await app.register(remixFastifyPlugin, {
    buildDir: path.join(process.cwd(), "build"),
    mode: MODE,
  });

  let port = process.env.PORT ? Number(process.env.PORT) || 3000 : 3000;

  let address = await app.listen({ port, host: "0.0.0.0" });
  console.log(`Fastify server listening at ${address}`);
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
