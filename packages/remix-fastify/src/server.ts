import { PassThrough } from "node:stream";
import type { FastifyRequest, FastifyReply } from "fastify";
import type { AppLoadContext, ServerBuild } from "@remix-run/node";
import {
  createRequestHandler as createRemixRequestHandler,
  createReadableStreamFromReadable,
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
) => Promise<AppLoadContext> | AppLoadContext;

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

export function getUrl(request: FastifyRequest): string {
  let origin = `${request.protocol}://${request.hostname}`;
  let url = `${origin}${request.url}`;
  return url;
}

export function createRemixRequest(
  request: FastifyRequest,
  reply: FastifyReply,
): Request {
  let url = getUrl(request);
  // Abort action/loaders once we can no longer write a response
  let controller = new AbortController();
  reply.raw.on("close", () => controller.abort());

  let init: RequestInit = {
    method: request.method,
    headers: createRemixHeaders(request.headers),
    signal: controller.signal,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = createReadableStreamFromReadable(request.raw);
    (init as { duplex: "half" }).duplex = "half";
  }

  return new Request(url, init);
}

export async function sendRemixResponse(
  reply: FastifyReply,
  nodeResponse: Response,
): Promise<void> {
  reply.status(nodeResponse.status);

  for (let [key, values] of nodeResponse.headers.entries()) {
    reply.headers({ [key]: values });
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
