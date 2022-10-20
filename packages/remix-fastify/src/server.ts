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
  reply: FastifyReply
) => AppLoadContext;

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
  mode = process.env.NODE_ENV,
}: {
  build: ServerBuild | string;
  getLoadContext?: GetLoadContextFunction;
  mode?: string;
}): RequestHandler {

  let shouldHotModuleReload = typeof build === "string" &&
    (mode === "development" || mode == null);

  let createLocalRequestHandler = () => createRemixRequestHandler(
    typeof build === "string" ? require(build) : build,
    mode);

  let staticRequestHandler = createLocalRequestHandler();

  return async (request, reply) => {
    let remixRequest = createRemixRequest(request);
    let loadContext =
      typeof getLoadContext === "function"
        ? getLoadContext(request, reply)
        : undefined;

    if (shouldHotModuleReload) {
      //@ts-expect-error TS is not smart enough to know that
      // this is a string when shouldHotModuleReload is true
      purgeRequireCache(build)
    };

    let response = (await (shouldHotModuleReload ? createLocalRequestHandler() : staticRequestHandler)(
      remixRequest,
      loadContext
    )) as NodeResponse;

    await sendRemixResponse(reply, response);
  };
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
  let url = new URL(request.url, origin);

  let controller = new AbortController();

  let init: NodeRequestInit = {
    method: request.method,
    headers: createRemixHeaders(request.headers),
    signal: controller.signal as AbortSignal,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.raw;
  }

  return new NodeRequest(url.href, init);
}

export async function sendRemixResponse(
  reply: FastifyReply,
  nodeResponse: NodeResponse
): Promise<void> {
  reply.status(nodeResponse.status);

  for (let [key, values] of Object.entries(nodeResponse.headers.raw())) {
    if (key.toLowerCase() === "set-cookie") {
      reply.raw.setHeader(key, values);
    } else {
      reply.raw.setHeader(key, values.join("; "));
    }
  }

  if (nodeResponse.body) {
    await writeReadableStreamToWritable(nodeResponse.body, reply.raw);
    return reply;
  } else {
    reply.send();
    return reply;
  }
}

  // purge require cache on requests for "server side HMR". Copied from
  // Remix templates
  function purgeRequireCache(buildDir: string) {
  // When using Jest, purging the require cache the regular way does not work,
  // because Jest does magic stuff with modules and skips the require cache.
  // So for the tests to work, we must reset Jest's cache.
  // Unfortunately, this means that the real code that clears the cache
  // (and which was copied from Remix) can only be tested by trying it out
  // manually with the example.
  if (typeof jest !== "undefined") {
    jest.resetModules()
    return
  }
  for (const key in require.cache) {
    if (key.startsWith(buildDir)) {
      delete require.cache[key];
    }
  }
}
