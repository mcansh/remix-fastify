import type { AppLoadContext, ServerBuild } from "@remix-run/node";
import {
  createRequestHandler,
  createReadableStreamFromReadable,
} from "@remix-run/node";
import type {
  FastifyRequest,
  FastifyReply,
  RouteGenericInterface,
} from "fastify";

import { createRequest, sendResponse } from "../shared";
import type {
  GetLoadContextFunction as GenericGetLoadContextFunction,
  HttpServer,
  RequestHandler,
} from "../shared";

export type CreateRequestHandlerFunction = typeof createRemixRequestHandler;
export type GetLoadContextFunction<Server extends HttpServer = HttpServer> =
  GenericGetLoadContextFunction<Server, AppLoadContext>;

/**
 * Returns a request handler for Fastify that serves the response using Remix.
 */
export function createRemixRequestHandler<Server extends HttpServer>({
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
    let remixRequest = createRemixRequest(request, reply);
    let loadContext = await getLoadContext?.(request, reply);
    let response = await handleRequest(remixRequest, loadContext);
    return sendResponse(reply, response);
  };
}

export function createRemixRequest<Server extends HttpServer>(
  request: FastifyRequest<RouteGenericInterface, Server>,
  reply: FastifyReply<RouteGenericInterface, Server>,
): Request {
  return createRequest(request, reply, createReadableStreamFromReadable);
}
