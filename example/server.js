import path from "node:path";
import fastify from "fastify";
import { remixFastifyPlugin } from "@mcansh/remix-fastify";

let MODE = process.env.NODE_ENV;

/** @type {import('@mcansh/remix-fastify').AdapterMiddlewareFunction} */
const adapterMiddleware = async ({ request, reply, context }) => {
  // Stick stuff in context on the way in
  context.set("userContext", reply);

  // Run the remix pipeline
  // - create a Fetch Request from the Express Request
  // - run all route middlewares/loaders/actions
  // - get back a Fetch Response
  let fetchResponse = await context.next();

  // Set response stuff on the way out
  fetchResponse.headers.set("x-whatever", "hello from middleware on fastify");

  return fetchResponse;
};

async function start() {
  let app = fastify();

  await app.register(remixFastifyPlugin, {
    build: path.join(process.cwd(), "build/index.js"),
    mode: MODE,
    purgeRequireCacheInDevelopment: false,
    adapterMiddleware,
  });

  let port = process.env.PORT ? Number(process.env.PORT) || 3000 : 3000;

  let address = await app.listen({ port, host: "0.0.0.0" });
  console.log(`✅ app ready: ${address}`);
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
