let path = require("node:path");
let fastify = require("fastify");
let { remixFastifyPlugin } = require("@mcansh/remix-fastify");

let MODE = process.env.NODE_ENV;

async function start() {
  let app = fastify();

  await app.register(remixFastifyPlugin, {
    build: path.join(process.cwd(), "build/index.js"),
    mode: MODE,
    getLoadContext() {
      return { loadContextName: "John Doe" };
    },
    purgeRequireCacheInDevelopment: false,
    unstable_earlyHints: true,
  });

  let port = process.env.PORT ? Number(process.env.PORT) || 3000 : 3000;

  let address = await app.listen({ port, host: "0.0.0.0" });
  console.log(`✅ app ready: ${address}`);
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
