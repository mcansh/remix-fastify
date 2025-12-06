import type { AppLoadContext } from "@remix-run/node";

import type {
  HttpServer,
  GetLoadContextFunction as SharedGetLoadContextFunction,
} from "./shared";
export type { RequestHandler } from "./shared";
export { createRemixRequestHandler } from "./servers/remix";

/** @deprecated this function has been renamed to createRemixRequestHandler */
export { createRemixRequestHandler as createRequestHandler } from "./servers/remix";
export { remixFastify } from "./plugins/remix";
export type { RemixFastifyOptions } from "./plugins/remix";

export type GetLoadContextFunction<Server extends HttpServer> =
  SharedGetLoadContextFunction<Server, AppLoadContext>;
