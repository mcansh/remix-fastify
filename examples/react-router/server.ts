import chalk from "chalk";
import { reactRouterFastify } from "@mcansh/remix-fastify/react-router";
import { fastify } from "fastify";
import sourceMapSupport from "source-map-support";
import { unstable_createContext } from "react-router";
import getPort, { portNumbers } from "get-port";

sourceMapSupport.install();

let app = fastify();

type AdapterContextType = {
	session: FastifySessionObject;
};

export const adapterContext = unstable_createContext<AdapterContextType>();

await app.register(reactRouterFastify, {
	getLoadContext(request: FastifyRequest): unstable_InitialContext {
		const map = new Map<unstable_RouterContext, unknown>();
		map.set(adapterContext, { session: request.session });
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
