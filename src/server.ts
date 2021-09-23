import { URL } from "node:url";
import { PassThrough } from "node:stream";

import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  AppLoadContext,
  ServerBuild,
  ServerPlatform,
} from "@remix-run/server-runtime";
import { createRequestHandler as createRemixRequestHandler } from "@remix-run/server-runtime";
import type {
  Request,
  RequestInit as NodeRequestInit,
  Response as NodeResponse,
} from "@remix-run/node";
import {
  Headers as NodeHeaders,
  Request as NodeRequest,
  formatServerError,
} from "@remix-run/node";

/**
 * A function that returns the value to use as `context` in route `loader` and
 * `action` functions.
 *
 * You can think of this as an escape hatch that allows you to pass
 * environment/platform-specific values through to your loader/action.
 */
export type GetAppLoadContext = (
  request: FastifyRequest,
  reply: FastifyReply
) => AppLoadContext;

export type RequestHandler = ReturnType<typeof createRequestHandler>;

export function createRequestHandler({
  build,
  getLoadContext,
  mode = process.env.NODE_ENV,
}: {
  build: ServerBuild;
  getLoadContext?: GetAppLoadContext;
  mode?: string;
}) {
  let platform: ServerPlatform = { formatServerError };
  let handleRequest = createRemixRequestHandler(build, platform, mode);

  return async (request: FastifyRequest, reply: FastifyReply) => {
    let remixRequest = createRemixRequest(request);
    let loadContext =
      typeof getLoadContext === "function"
        ? getLoadContext(request, reply)
        : undefined;

    let response = (await handleRequest(
      remixRequest as unknown as Request,
      loadContext
    )) as unknown as NodeResponse;

    reply.code(response.status);
    reply.headers(response.headers.raw());

    if (Buffer.isBuffer(response.body)) {
      return reply.send(response.body);
    }

    return response.body.pipe(reply.raw);
  };
}

function createRemixHeaders(
  requestHeaders: FastifyRequest["headers"]
): NodeHeaders {
  let headers = new NodeHeaders();

  for (let [header, values] of Object.entries(requestHeaders)) {
    if (!values) continue;
    for (let value of values) {
      headers.append(header, value);
    }
  }

  return headers;
}

function createRemixRequest(request: FastifyRequest): NodeRequest {
  let origin = `${request.protocol}://${request.hostname}`;
  let url = new URL(request.url, origin);

  let init: NodeRequestInit = {
    method: request.method,
    headers: createRemixHeaders(request.headers),
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body as any;
  }

  return new NodeRequest(url.toString(), init);
}
