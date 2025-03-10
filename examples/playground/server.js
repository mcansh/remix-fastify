import { reactRouterFastify } from "@mcansh/remix-fastify/react-router";
import chalk from "chalk";
import { fastify } from "fastify";
import getPort, { portNumbers } from "get-port";
import { unstable_createContext } from "react-router";
import sourceMapSupport from "source-map-support";

sourceMapSupport.install();

let app = fastify();

app.post("/api/echo", async (request, reply) => {
  reply.send(request.body);
});

await app.register(reactRouterFastify);

const desiredPort = Number(process.env.PORT) || 3000;
const portToUse = await getPort({
  port: portNumbers(desiredPort, desiredPort + 100),
});

let address = await app.listen({ port: portToUse, host: "0.0.0.0" });

if (portToUse !== desiredPort) {
  console.warn(
    chalk.yellow(
      `⚠️ Port ${desiredPort} is not available, using ${portToUse} instead.`,
    ),
  );
}

console.log(chalk.green(`✅ app ready: ${address}`));
