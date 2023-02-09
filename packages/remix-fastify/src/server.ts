import { PassThrough } from "node:stream";
import type { FastifyRequest, FastifyReply } from "fastify";
import type {
  AppLoadContext,
  ServerBuild,
  RequestInit as NodeRequestInit,
  Response as NodeResponse,
  MiddlewareContext,
} from "@remix-run/node";
import {
  AbortController,
  createRequestHandler as createRemixRequestHandler,
  Headers as NodeHeaders,
  Request as NodeRequest,
  writeReadableStreamToWritable,
} from "@remix-run/node";
import {
  UNSAFE_createMiddlewareStore as createMiddlewareStore,
  UNSAFE_getRouteAwareMiddlewareContext as getRouteAwareMiddlewareContext,
} from "@remix-run/router";

/**
 * A function that returns the value to use as `context` in route `loader` and
 * `action` functions.
 *
 * You can think of this as an escape hatch that allows you to pass
 * environment/platform-specific values through to your loader/action.
 */
export type GetLoadContextFunction = (
  request: FastifyRequest,
  reply: FastifyReply
) => AppLoadContext;

export type AdapterMiddlewareFunction = ({
  request,
  reply,
  context,
}: {
  request: FastifyRequest;
  reply: FastifyReply;
  context: MiddlewareContext;
}) => Promise<Response>;

export type RequestHandler = (
  request: FastifyRequest,
  reply: FastifyReply
) => Promise<void>;

/**
 * Returns a request handler for Fastify that serves the response using Remix.
 */
export function createRequestHandler({
  build,
  getLoadContext,
  adapterMiddleware,
  mode = process.env.NODE_ENV,
}: {
  build: ServerBuild;
  adapterMiddleware?: AdapterMiddlewareFunction;
  getLoadContext?: GetLoadContextFunction;
  mode?: string;
}): RequestHandler {
  let handleRequest = createRemixRequestHandler(build, mode);

  if (build.future.unstable_middleware) {
    return async (request, reply) => {
      let remixResponse: NodeResponse | undefined;

      if (adapterMiddleware) {
        let context = createMiddlewareStore();
        let callRemix = async () => {
          let remixRequest = createRemixRequest(request);
          remixResponse = (await handleRequest(
            remixRequest,
            undefined,
            context
          )) as NodeResponse;
          return remixResponse;
        };
        let routeAwareContext = getRouteAwareMiddlewareContext(
          context,
          -1,
          callRemix
        );

        await adapterMiddleware({
          request,
          reply,
          context: routeAwareContext,
        });

        if (!remixResponse) {
          remixResponse = await callRemix();
        }

        if (!reply.sent) {
          await sendRemixResponse(reply, remixResponse);
        }
      } else {
        let remixRequest = createRemixRequest(request);
        remixResponse = (await handleRequest(remixRequest)) as NodeResponse;
        await sendRemixResponse(reply, remixResponse);
      }
    };
  } else {
    return async (request, reply) => {
      let remixRequest = createRemixRequest(request);
      let loadContext =
        typeof getLoadContext === "function"
          ? getLoadContext(request, reply)
          : undefined;

      let response = (await handleRequest(
        remixRequest,
        loadContext
      )) as NodeResponse;

      await sendRemixResponse(reply, response);
    };
  }
}

export function createRemixHeaders(
  requestHeaders: FastifyRequest["headers"]
): NodeHeaders {
  let headers = new NodeHeaders();

  for (let [header, values] of Object.entries(requestHeaders)) {
    if (!values) continue;

    if (Array.isArray(values)) {
      for (let value of values) {
        headers.append(header, value);
      }
    } else {
      headers.set(header, values);
    }
  }

  return headers;
}

export function createRemixRequest(request: FastifyRequest): NodeRequest {
  let origin = `${request.protocol}://${request.hostname}`;
  let url = `${origin}${request.url}`;

  let controller = new AbortController();

  let init: NodeRequestInit = {
    method: request.method,
    headers: createRemixHeaders(request.headers),
    signal: controller.signal as AbortSignal,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.raw;
  }

  return new NodeRequest(url, init);
}

export async function sendRemixResponse(
  reply: FastifyReply,
  nodeResponse: NodeResponse
): Promise<void> {
  reply.status(nodeResponse.status);

  for (let [key, values] of Object.entries(nodeResponse.headers.raw())) {
    for (let value of values) {
      reply.header(key, value);
    }
  }

  if (nodeResponse.body) {
    let stream = new PassThrough();
    reply.send(stream);
    await writeReadableStreamToWritable(nodeResponse.body, stream);
  } else {
    reply.send();
  }
}
