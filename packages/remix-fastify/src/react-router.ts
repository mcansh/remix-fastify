import type { AppLoadContext } from "react-router";

import type {
  HttpServer,
  GetLoadContextFunction as SharedGetLoadContextFunction,
} from "./shared";
export type { RequestHandler } from "./shared";
export { createReactRouterRequestHandler } from "./servers/react-router";

/** @deprecated this function has been renamed to createReactRouterRequestHandler */
export { createReactRouterRequestHandler as createRequestHandler } from "./servers/react-router";
export { reactRouterFastify } from "./plugins/react-router";
export type { ReactRouterFastifyOptions } from "./plugins/react-router";

export type GetLoadContextFunction<Server extends HttpServer> =
  SharedGetLoadContextFunction<Server, AppLoadContext>;
