import { Readable } from "node:stream";
import type * as http from "node:http";
import type * as http2 from "node:http2";
import type * as https from "node:https";
import type {
  FastifyRequest,
  FastifyReply,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  RouteGenericInterface,
} from "fastify";
import type { AppLoadContext, ServerBuild } from "@remix-run/node";
import {
  createRequestHandler as createRemixRequestHandler,
  createReadableStreamFromReadable,
} from "@remix-run/node";

export type HttpServer =
  | http.Server
  | https.Server
  | http2.Http2Server
  | http2.Http2SecureServer;

export type HttpRequest = RawRequestDefaultExpression<HttpServer>;
export type HttpResponse = RawReplyDefaultExpression<HttpServer>;

/**
 * A function that returns the value to use as `context` in route `loader` and
 * `action` functions.
 *
 * You can think of this as an escape hatch that allows you to pass
 * environment/platform-specific values through to your loader/action.
 */
export type GetLoadContextFunction<Server extends HttpServer> = (
  request: FastifyRequest<RouteGenericInterface, Server>,
  reply: FastifyReply<RouteGenericInterface, Server>,
) => Promise<AppLoadContext> | AppLoadContext;

export type RequestHandler<Server extends HttpServer> = (
  request: FastifyRequest<RouteGenericInterface, Server>,
  reply: FastifyReply<RouteGenericInterface, Server>,
) => Promise<void>;

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
    let remixRequest = createRemixRequest(request, reply);
    let loadContext = await getLoadContext?.(request, reply);

    let response = await handleRequest(remixRequest, loadContext);

    return sendRemixResponse(reply, response);
  };
}

export function createRemixHeaders(
  requestHeaders: FastifyRequest["headers"],
): Headers {
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
  let host = "host" in request ? request.host : request.hostname;
  let origin = `${request.protocol}://${host}`;
  // Use `request.originalUrl` so Remix is aware of the full path
  let url = `${origin}${request.originalUrl}`;
  return url;
}

export function createRemixRequest<Server extends HttpServer>(
  request: FastifyRequest<RouteGenericInterface, Server>,
  reply: FastifyReply<RouteGenericInterface, Server>,
): Request {
  let url = getUrl(request);

  let controller: AbortController | null = new AbortController();

  let init: RequestInit = {
    method: request.method,
    headers: createRemixHeaders(request.headers),
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

export async function sendRemixResponse<Server extends HttpServer>(
  reply: FastifyReply<RouteGenericInterface, Server>,
  nodeResponse: Response,
): Promise<void> {
  reply.status(nodeResponse.status);

  for (let [key, values] of nodeResponse.headers.entries()) {
    reply.headers({ [key]: values });
  }

  if (nodeResponse.body) {
    let stream = responseToReadable(nodeResponse.clone());
    return reply.send(stream);
  }

  return reply.send(await nodeResponse.text());
}

function responseToReadable(response: Response): Readable | null {
  if (!response.body) return null;

  let reader = response.body.getReader();
  let readable = new Readable();
  readable._read = async () => {
    let result = await reader.read();
    if (!result.done) {
      readable.push(Buffer.from(result.value));
    } else {
      readable.push(null);
      return;
    }
  };

  return readable;
}
