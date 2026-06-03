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
  RouterContextProvider,
  UNSAFE_MiddlewareEnabled as MiddlewareEnabled,
} from "react-router";
import type { ViteDevServer } from "vite";

type MaybePromise<T> = T | Promise<T>;

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
 *
 * When the `v8_middleware` future flag is enabled this must return a
 * `RouterContextProvider`; otherwise it returns your augmented `AppLoadContext`.
 */
export type GetLoadContextFunction<Server extends HttpServer> = (
  request: FastifyRequest<RouteGenericInterface, Server>,
  reply: FastifyReply<RouteGenericInterface, Server>,
) => MiddlewareEnabled extends true
  ? MaybePromise<RouterContextProvider>
  : MaybePromise<AppLoadContext>;

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

const DEV_SERVER_KEY = "__mcansh_remix_fastify_vite_dev_server__";

/**
 * Stashes the Vite dev server on `globalThis` so that {@link reactRouterFastify}
 * (which runs inside your server entry, loaded via `ssrLoadModule`) can read it
 * without a direct reference. Set by the `fastifyDevServer` Vite plugin.
 */
export function setDevServer(server: ViteDevServer): void {
  (globalThis as Record<string, unknown>)[DEV_SERVER_KEY] = server;
}

/**
 * Returns the Vite dev server when running under `fastifyDevServer`, otherwise
 * `undefined`. Use this in your server entry to only call `app.listen()` in
 * production:
 *
 * ```ts
 * if (!getDevServer()) await app.listen({ port: 3000 });
 * ```
 */
export function getDevServer(): ViteDevServer | undefined {
  return (globalThis as Record<string, unknown>)[DEV_SERVER_KEY] as
    | ViteDevServer
    | undefined;
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
