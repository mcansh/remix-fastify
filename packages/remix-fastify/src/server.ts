import type * as http from "node:http";
import type * as http2 from "node:http2";
import type * as https from "node:https";
import { Readable } from "node:stream";

import { createReadableStreamFromReadable } from "@react-router/node";
import type {
  FastifyReply,
  FastifyRequest,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RouteGenericInterface,
} from "fastify";
import type {
  AppLoadContext,
  UNSAFE_MiddlewareEnabled as MiddlewareEnabled,
  RouterContextProvider,
  ServerBuild,
} from "react-router";
import { createRequestHandler as createReactRouterRequestHandler } from "react-router";

/**
 * Node HTTP server types supported by this Fastify adapter.
 */
export type HttpServer = http.Server | https.Server | http2.Http2Server | http2.Http2SecureServer;

export type HttpRequest = RawRequestDefaultExpression<HttpServer>;
export type HttpResponse = RawReplyDefaultExpression<HttpServer>;

/**
 * Handles a Fastify request by sending the React Router response.
 *
 * @param request Fastify request to adapt into a Web Fetch `Request`.
 * @param reply Fastify reply used to send the React Router `Response`.
 * @returns A promise that settles after the response has been sent.
 */
export type RequestHandler<Server extends HttpServer = HttpServer> = (
  request: FastifyRequest<RouteGenericInterface, Server>,
  reply: FastifyReply<RouteGenericInterface, Server>,
) => Promise<void>;

/**
 * The value React Router passes to route `loader`/`action` functions as
 * `context`. When middleware is enabled this is a `RouterContextProvider`
 * instance, otherwise it is the (augmentable) `AppLoadContext`.
 */
export type ReactRouterLoadContext = MiddlewareEnabled extends true
  ? RouterContextProvider
  : AppLoadContext;

/**
 * A function that returns the value to use as `context` in route `loader` and
 * `action` functions.
 *
 * You can think of this as an escape hatch that allows you to pass
 * environment/platform-specific values through to your loaders/actions.
 *
 * @param request Fastify request for the current navigation or data request.
 * @param reply Fastify reply for the current navigation or data request.
 * @returns The context value passed to React Router loaders and actions.
 */
export type GetLoadContextFunction<Server extends HttpServer = HttpServer> = (
  request: FastifyRequest<RouteGenericInterface, Server>,
  reply: FastifyReply<RouteGenericInterface, Server>,
) => Promise<ReactRouterLoadContext> | ReactRouterLoadContext;

export function createHeaders(requestHeaders: FastifyRequest["headers"]): Headers {
  let headers = new Headers();

  for (let [key, values] of Object.entries(requestHeaders)) {
    if (values) {
      if (Array.isArray(values)) {
        for (let value of values) {
          headers.append(key, value);
        }
      } else {
        headers.set(key, values);
      }
    }
  }

  return headers;
}

export function getUrl<Server extends HttpServer>(
  request: FastifyRequest<RouteGenericInterface, Server>,
): string {
  let origin = `${request.protocol}://${request.host}`;
  // Use `request.originalUrl` so React Router is aware of the full path
  return `${origin}${request.originalUrl}`;
}

export function createRequest<Server extends HttpServer>(
  request: FastifyRequest<RouteGenericInterface, Server>,
  reply: FastifyReply<RouteGenericInterface, Server>,
): Request {
  let url = getUrl(request);

  let controller: AbortController | null = new AbortController();

  let init: RequestInit = {
    method: request.method,
    headers: createHeaders(request.headers),
    signal: controller.signal,
  };

  // Abort action/loaders once we can no longer write a response if we have
  // not yet sent a response (i.e., `close` without `finish`)
  // `finish` -> done rendering the response
  // `close` -> response can no longer be written to
  reply.raw.on("finish", () => (controller = null));
  reply.raw.on("close", () => controller?.abort());

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = createReadableStreamFromReadable(request.raw);
    init.duplex = "half";
  }

  return new Request(url, init);
}

export async function sendResponse<Server extends HttpServer>(
  reply: FastifyReply<RouteGenericInterface, Server>,
  nodeResponse: Response,
): Promise<void> {
  reply.status(nodeResponse.status);

  for (let [key, values] of nodeResponse.headers.entries()) {
    reply.headers({ [key]: values });
  }

  if (nodeResponse.body) {
    let stream = responseToReadable(nodeResponse);
    return reply.send(stream);
  }

  return reply.send(await nodeResponse.text());
}

function responseToReadable(response: Response): Readable | null {
  if (!response.body) return null;

  let reader = response.body.getReader();
  let readable = new Readable();
  readable._read = async () => {
    try {
      let result = await reader.read();
      if (!result.done) {
        readable.push(Buffer.from(result.value));
      } else {
        readable.push(null);
      }
    } catch (error) {
      readable.destroy(error as Error);
      throw error;
    }
  };

  return readable;
}

/**
 * Returns a Fastify route handler that serves the response using React Router.
 *
 * @param options React Router request handler options.
 * @returns A Fastify route handler for React Router requests.
 */
export function createRequestHandler<Server extends HttpServer = HttpServer>(options: {
  /**
   * React Router server build or a function that loads it.
   */
  build: ServerBuild | (() => ServerBuild | Promise<ServerBuild>);
  /**
   * Function that provides loader and action context for each request.
   */
  getLoadContext?: GetLoadContextFunction<Server>;
  /**
   * Runtime mode passed to React Router's request handler. (defaults to
   * `process.env.NODE_ENV`).
   */
  mode?: string;
}): RequestHandler<Server> {
  let { build, getLoadContext, mode = process.env.NODE_ENV } = options;
  let handleRequest = createReactRouterRequestHandler(build, mode);

  return async (request, reply) => {
    let request_ = createRequest(request, reply);
    let loadContext = await getLoadContext?.(request, reply);
    let response = await handleRequest(request_, loadContext);
    return sendResponse(reply, response);
  };
}
