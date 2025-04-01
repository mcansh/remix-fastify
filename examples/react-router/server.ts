import chalk from "chalk";
import { reactRouterFastify } from "@mcansh/remix-fastify/react-router";
import { fastify } from "fastify";
import sourceMapSupport from "source-map-support";
import getPort, { portNumbers } from "get-port";
import {
  unstable_createContext,
  type unstable_InitialContext,
  type unstable_RouterContext,
} from "react-router";
import { adapterContext } from "./context.ts";

sourceMapSupport.install();

let app = fastify();

await app.register(reactRouterFastify, {
  getLoadContext(_request): unstable_InitialContext {
    const map = new Map<unstable_RouterContext, unknown>();
    map.set(adapterContext, { session: "" });
    return map;
  },
});

const desiredPort = Number(process.env.PORT) || 3000;
const portToUse = await getPort({
  port: portNumbers(desiredPort, desiredPort + 100),
});

let address = await app.listen({ port: portToUse, host: "0.0.0.0" });

if (portToUse !== desiredPort) {
  console.warn(
    chalk.yellow(
      `⚠️  Port ${desiredPort} is not available, using ${portToUse} instead.`,
    ),
  );
}

console.log(chalk.green(`✅ app ready: ${address}`));
