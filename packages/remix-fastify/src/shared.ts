import type * as http from "node:http";
import type * as http2 from "node:http2";
import type * as https from "node:https";
import { Readable } from "node:stream";

import type { createReadableStreamFromReadable as RRCreateReadableStreamFromReadable } from "@react-router/node";
import type { createReadableStreamFromReadable as RemixCreateReadableStreamFromReadable } from "@remix-run/node";
import type {
  FastifyReply,
  FastifyRequest,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RouteGenericInterface,
} from "fastify";

export type HttpServer =
  | http.Server
  | https.Server
  | http2.Http2Server
  | http2.Http2SecureServer;

export type HttpRequest = RawRequestDefaultExpression<HttpServer>;
export type HttpResponse = RawReplyDefaultExpression<HttpServer>;

export type RequestHandler<Server extends HttpServer> = (
  request: FastifyRequest<RouteGenericInterface, Server>,
  reply: FastifyReply<RouteGenericInterface, Server>,
) => Promise<void>;

/**
 * A function that returns the value to use as `context` in route `loader` and
 * `action` functions.
 *
 * You can think of this as an escape hatch that allows you to pass
 * environment/platform-specific values through to your loader/action.
 */
export type GetLoadContextFunction<
  Server extends HttpServer,
  AppLoadContext,
> = (
  request: FastifyRequest<RouteGenericInterface, Server>,
  reply: FastifyReply<RouteGenericInterface, Server>,
) => Promise<AppLoadContext> | AppLoadContext;

export function createHeaders(
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
  // req.hostname doesn't include port information so grab that from
  // `X-Forwarded-Host` or `Host`
  let [, hostnamePortStr] = request.headers["X-Forwarded-Host"]?.split(":") ?? [];
  let [, hostPortStr] = request.headers.host?.split(":") ?? [];
  let hostnamePort = Number.parseInt(hostnamePortStr, 10);
  let hostPort = Number.parseInt(hostPortStr, 10);
  let port = Number.isSafeInteger(hostnamePort)
    ? hostnamePort
    : Number.isSafeInteger(hostPort)
    ? hostPort
    : "";
  
  // Use req.hostname here as it respects the "trust proxy" setting
  let resolvedHost = `${req.hostname}${port ? `:${port}` : ""}`;
  // Use `req.originalUrl` so Remix is aware of the full path
  let url = new URL(req.originalUrl, `${req.protocol}://${resolvedHost}`);
  return url.toString()
}

export function createRequest<Server extends HttpServer>(
  request: FastifyRequest<RouteGenericInterface, Server>,
  reply: FastifyReply<RouteGenericInterface, Server>,
  createReadableStreamFromReadable:
    | typeof RemixCreateReadableStreamFromReadable
    | typeof RRCreateReadableStreamFromReadable,
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
