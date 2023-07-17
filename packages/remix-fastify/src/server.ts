import { PassThrough } from "node:stream";
import type { FastifyRequest, FastifyReply } from "fastify";
import type {
  AppLoadContext,
  ServerBuild,
  RequestInit as NodeRequestInit,
  Response as NodeResponse,
} from "@remix-run/node";
import {
  AbortController,
  createRequestHandler as createRemixRequestHandler,
  Headers as NodeHeaders,
  Request as NodeRequest,
  writeReadableStreamToWritable,
} from "@remix-run/node";

/**
 * A function that returns the value to use as `context` in route `loader` and
 * `action` functions.
 *
 * You can think of this as an escape hatch that allows you to pass
 * environment/platform-specific values through to your loader/action.
 */
export type GetLoadContextFunction = (
  request: FastifyRequest,
  reply: FastifyReply,
) => AppLoadContext;

export type RequestHandler = (
  request: FastifyRequest,
  reply: FastifyReply,
) => Promise<void>;

/**
 * Returns a request handler for Fastify that serves the response using Remix.
 */
export function createRequestHandler({
  build,
  getLoadContext,
  mode = process.env.NODE_ENV,
}: {
  build: ServerBuild;
  getLoadContext?: GetLoadContextFunction;
  mode?: string;
}): RequestHandler {
  let handleRequest = createRemixRequestHandler(build, mode);

  return async (request, reply) => {
    let remixRequest = createRemixRequest(request, reply);
    let loadContext =
      typeof getLoadContext === "function"
        ? getLoadContext(request, reply)
        : undefined;

    let response = (await handleRequest(
      remixRequest,
      loadContext,
    )) as unknown as NodeResponse;

    return sendRemixResponse(reply, response);
  };
}

export function createRemixHeaders(
  requestHeaders: FastifyRequest["headers"],
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

export function createRemixRequest(
  request: FastifyRequest,
  reply: FastifyReply,
): NodeRequest {
  let origin = `${request.protocol}://${request.hostname}`;
  let url = `${origin}${request.url}`;
  let controller = new AbortController();

  reply.raw.on("close", () => controller.abort());

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
  nodeResponse: NodeResponse,
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
  return reply;
}
