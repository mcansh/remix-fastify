import { remixFastify } from "@mcansh/remix-fastify";
import { installGlobals } from "@remix-run/node";
import { fastify } from "fastify";

installGlobals();

let app = fastify();

app.post("/api/echo", async (request, reply) => {
  reply.send(request.body);
});

await app.register(remixFastify, {
  getLoadContext(request, reply) {
    return { loadContextName: "Logan" };
  },
});

let port = Number(process.env.PORT) || 3000;

let address = await app.listen({ port, host: "0.0.0.0" });
console.log(`✅ app ready: ${address}`);
