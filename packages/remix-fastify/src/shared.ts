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
  let origin = `${request.protocol}://${request.host}`;
  // Use `request.originalUrl` so Remix and React Router are aware of the full path
  let url = `${origin}${request.originalUrl}`;
  return url;
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

  // Collect all headers from the response first
  let responseHeaders = new Map<string, string[]>();
  for (let [key, value] of nodeResponse.headers.entries()) {
    if (!responseHeaders.has(key)) {
      responseHeaders.set(key, []);
    }
    // The Web Headers API treats Set-Cookie specially: each value appears as a separate
    // entry when iterating. For all other headers, multiple values are combined with ", ".
    // We split non-Set-Cookie headers on ", " to enable proper merging with existing headers.
    // Note: This split is imperfect for headers that contain commas in their values
    // (like some Cache-Control directives), but it's necessary because the Headers API
    // has already combined them and provides no way to get the original separate values.
    // The Link header (the primary use case from the issue) works correctly with this approach.
    if (key.toLowerCase() === "set-cookie") {
      responseHeaders.get(key)!.push(value);
    } else {
      let splitValues = value.split(", ");
      responseHeaders.get(key)!.push(...splitValues);
    }
  }

  // Now set headers, merging with any existing headers on the reply
  for (let [key, values] of responseHeaders.entries()) {
    let existingHeader = reply.hasHeader(key) ? reply.getHeader(key) : undefined;
    
    if (existingHeader !== undefined) {
      // Header exists on reply - merge with response headers
      let existingValues = Array.isArray(existingHeader) 
        ? existingHeader 
        : [String(existingHeader)];
      let mergedValues = [...existingValues, ...values];
      reply.header(key, mergedValues);
    } else {
      // No existing header on reply - just set response headers
      reply.header(key, values.length === 1 ? values[0] : values);
    }
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
