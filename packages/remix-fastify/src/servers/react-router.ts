import type {
  FastifyRequest,
  FastifyReply,
  RouteGenericInterface,
} from "fastify";
import { createRequestHandler as createRemixRequestHandler } from "react-router";
import type { AppLoadContext, ServerBuild } from "react-router";
import { createReadableStreamFromReadable } from "@react-router/node";
import { createRequestInit, getUrl, sendResponse } from "../shared";
import type {
  HttpServer,
  RequestHandler,
  GetLoadContextFunction as GenericGetLoadContextFunction,
} from "../shared";

export type CreateRequestHandlerFunction = typeof createRequestHandler;
export type GetLoadContextFunction<Server extends HttpServer = HttpServer> =
  GenericGetLoadContextFunction<Server, AppLoadContext>;

/**
 * Returns a request handler for Fastify that serves the response using Remix.
 */
export function createRequestHandler<Server extends HttpServer>({
  build,
  getLoadContext,
  mode = process.env.NODE_ENV,
}: {
  build: ServerBuild | (() => ServerBuild | Promise<ServerBuild>);
  getLoadContext?: GetLoadContextFunction<Server>;
  mode?: string;
}): RequestHandler<Server> {
  let handleRequest = createRemixRequestHandler(build, mode);

  return async (request, reply) => {
    let remixRequest = createRequest(request, reply);
    let loadContext = await getLoadContext?.(request, reply);
    let response = await handleRequest(remixRequest, loadContext);
    return sendResponse(reply, response);
  };
}

function createRequest<Server extends HttpServer>(
  request: FastifyRequest<RouteGenericInterface, Server>,
  reply: FastifyReply<RouteGenericInterface, Server>,
): Request {
  let url = getUrl(request);
  let init = createRequestInit(request, reply);

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = createReadableStreamFromReadable(request.raw);
    init.duplex = "half";
  }

  return new Request(url, init);
}
