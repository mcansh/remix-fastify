import { URL } from "node:url";

import {
  ServerBuild,
  AppLoadContext,
  createRequestHandler as createNodeRequestHandler,
  Request,
  RequestInit,
  Headers,
} from "@remix-run/node";
import { FastifyReply, FastifyRequest } from "fastify";
import { PassThrough } from "node:stream";

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
  let handleRequest = createNodeRequestHandler(build, mode);

  return async (request: FastifyRequest, reply: FastifyReply) => {
    let remixRequest = createRemixRequest(request);
    let loadContext =
      typeof getLoadContext === "function"
        ? getLoadContext(request, reply)
        : undefined;

    let response = await handleRequest(remixRequest, loadContext);

    if (Buffer.isBuffer(response.body)) {
      return reply
        .code(response.status)
        .headers(response.headers.raw())
        .send(response.body);
    }

    return response.body.pipe(reply.raw);
  };
}

function createRemixHeaders(
  requestHeaders: FastifyRequest["headers"]
): Headers {
  let headers = new Headers();

  for (let [header, values] of Object.entries(requestHeaders)) {
    if (!values) continue;
    for (let value of values) {
      headers.append(header, value);
    }
  }

  return headers;
}

function createRemixRequest(request: FastifyRequest): Request {
  let origin = `${request.protocol}://${request.hostname}`;
  let url = new URL(request.url, origin);

  let init: RequestInit = {
    method: request.method,
    headers: createRemixHeaders(request.headers),
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.raw.pipe(new PassThrough({ highWaterMark: 16384 }));
  }

  return new Request(url.toString(), init);
}
