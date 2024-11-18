import type {
  FastifyRequest,
  FastifyReply,
  RouteGenericInterface,
} from "fastify";
import type { AppLoadContext, ServerBuild } from "react-router";
import { createRequestHandler } from "react-router";
import { createReadableStreamFromReadable } from "@react-router/node";
import { createRequest, sendResponse } from "../shared";
import type {
  GetLoadContextFunction as GenericGetLoadContextFunction,
  HttpServer,
  RequestHandler,
} from "../shared";

export type CreateRequestHandlerFunction =
  typeof createReactRouterRequestHandler;
export type GetLoadContextFunction<Server extends HttpServer = HttpServer> =
  GenericGetLoadContextFunction<Server, AppLoadContext>;

/**
 * Returns a request handler for Fastify that serves the response using Remix.
 */
export function createReactRouterRequestHandler<Server extends HttpServer>({
  build,
  getLoadContext,
  mode = process.env.NODE_ENV,
}: {
  build: ServerBuild | (() => ServerBuild | Promise<ServerBuild>);
  getLoadContext?: GetLoadContextFunction<Server>;
  mode?: string;
}): RequestHandler<Server> {
  let handleRequest = createRequestHandler(build, mode);

  return async (request, reply) => {
    let remixRequest = createReactRouterRequest(request, reply);
    let loadContext = await getLoadContext?.(request, reply);
    let response = await handleRequest(remixRequest, loadContext);
    return sendResponse(reply, response);
  };
}

export function createReactRouterRequest<Server extends HttpServer>(
  request: FastifyRequest<RouteGenericInterface, Server>,
  reply: FastifyReply<RouteGenericInterface, Server>,
): Request {
  return createRequest(request, reply, createReadableStreamFromReadable);
}
