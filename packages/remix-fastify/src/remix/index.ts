import type { AppLoadContext } from "@remix-run/node";

import type {
  HttpServer,
  GetLoadContextFunction as SharedGetLoadContextFunction,
} from "../shared-server.ts";
export type { RequestHandler } from "../shared-server.ts";
export { createRemixRequestHandler } from "./server.ts";

/** @deprecated this function has been renamed to createRemixRequestHandler */
export { createRemixRequestHandler as createRequestHandler } from "./server.ts";
export { remixFastify } from "./plugin.ts";
export type { RemixFastifyOptions } from "./plugin.ts";

export type GetLoadContextFunction<Server extends HttpServer> =
  SharedGetLoadContextFunction<Server, AppLoadContext>;
