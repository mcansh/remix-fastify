import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  RequestInit as NodeRequestInit,
  Response as NodeResponse,
  AppLoadContext,
  ServerBuild,
} from "@remix-run/node";
import {
  // This has been added as a global in node 15+
  AbortController,
  Headers as NodeHeaders,
  Request as NodeRequest,
  createRequestHandler as createRemixRequestHandler,
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
  build: ServerBuild;
  getLoadContext?: GetLoadContextFunction;
  mode?: string;
}) {
  let handleRequest = createRemixRequestHandler(build, mode);

  return async (fastifyReq: FastifyRequest, fastifyRes: FastifyReply) => {
    let abortController = new AbortController();
    let remixRequest = createRemixRequest(fastifyReq, abortController);
    let loadContext =
      typeof getLoadContext === "function"
        ? getLoadContext(fastifyReq, fastifyRes)
        : undefined;

    let nodeRes = (await handleRequest(
      remixRequest as unknown as Request,
      loadContext
    )) as unknown as NodeResponse;

    sendRemixResponse(fastifyRes, nodeRes, abortController);
  };
}

export function createRemixHeaders(
  fastifyReqHeaders: FastifyRequest["headers"]
): NodeHeaders {
  let headers = new NodeHeaders();

  for (let [header, values] of Object.entries(fastifyReqHeaders)) {
    if (!values) continue;

    if (Array.isArray(values)) {
      for (let value of values) {
        headers.append(header, value);
      }
    } else {
      headers.append(header, values);
    }
  }

  return headers;
}

export function createRemixRequest(
  fastifyReq: FastifyRequest,
  abortController?: AbortController
): NodeRequest {
  let origin = `${fastifyReq.protocol}://${fastifyReq.hostname}`;
  let url = new URL(fastifyReq.url, origin);

  let init: NodeRequestInit = {
    method: fastifyReq.method,
    headers: createRemixHeaders(fastifyReq.headers),
    signal: abortController?.signal,
    abortController,
  };

  if (fastifyReq.method !== "GET" && fastifyReq.method !== "HEAD") {
    init.body = fastifyReq.body as NodeRequestInit["body"] | undefined;
  }

  return new NodeRequest(url.href, init);
}

function sendRemixResponse(
  fastifyRes: FastifyReply,
  nodeRes: NodeResponse,
  abortController: AbortController
): void {
  fastifyRes.code(nodeRes.status);

  for (const [key, values] of Object.entries(nodeRes.headers.raw())) {
    // fastify can accept array for set-cookie header
    // but for the rest we should use string
    if (key.toLowerCase() === "set-cookie") {
      void fastifyRes.headers({ [key]: values });
    } else {
      void fastifyRes.header(key, values.join("; "));
    }
  }

  if (abortController.signal.aborted) {
    fastifyRes.headers({ Connection: "close" });
  }

  if (Buffer.isBuffer(nodeRes.body)) {
    fastifyRes.send(nodeRes.body);
  } else if (nodeRes.body?.pipe) {
    nodeRes.body.pipe(fastifyRes.raw);
  } else {
    fastifyRes.send();
  }
}
