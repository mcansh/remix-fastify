import process from "node:process";
import { remixFastify } from "@mcansh/remix-fastify";
import { installGlobals } from "@remix-run/node";
import { fastify } from "fastify";

installGlobals();

const app = fastify();

await app.register(remixFastify);

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST === "true" ? "0.0.0.0" : "127.0.0.1";

let address = await app.listen({ port, host });
console.log(`✅ app ready: ${address}`);
