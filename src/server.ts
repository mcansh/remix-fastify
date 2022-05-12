import path from "path";

import fp from "fastify-plugin";
import fastifyStatic from "@fastify/static";
import type { AppLoadContext, ServerBuild } from "@remix-run/node";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import {
  createRequestHandler as createRemixRequestHandler,
  Response as NodeResponse,
  Headers as NodeHeaders,
  Request as NodeRequest,
  RequestInit as NodeRequestInit,
  AbortController,
} from "@remix-run/node";

interface PluginOptions {
  mode?: string;
  build?: ServerBuild;
  // Same as assetsBuildDirectory in remix.config.js, but absolute or relative to this file
  assetsBuildDirectory?: string;
  // Must match the same setting in remix.config.js
  publicPath?: string;
}

const remixFastify: FastifyPluginAsync<PluginOptions> = async (
  fastify,
  options = {}
) => {
  let fullOptions = Object.assign(
    {
      mode: process.env.NODE_ENV,
      assetsBuildDirectory: path.resolve(process.cwd(), "public", "build"),
      publicPath: "/build/",
    },
    options
  );

  if (!fullOptions.build) {
    throw new Error("Must provide a build");
  }

  if (!fastify.hasContentTypeParser("*")) {
    await fastify.addContentTypeParser("*", (_request, payload, done) => {
      let data = "";
      payload.on("data", (chunk) => {
        data += chunk;
      });
      payload.on("end", () => {
        done(null, data);
      });
    });
  }

  await fastify.register(fastifyStatic, {
    root: fullOptions.assetsBuildDirectory,
    prefix: "/",
    wildcard: false,
    maxAge: 31536000,
    dotfiles: "allow",
  });

  await fastify.register(fastifyStatic, {
    // the reply decorator has been added by the first plugin registration
    decorateReply: false,
    root: path.join(process.cwd(), "public"),
    prefix: "/",
    wildcard: false,
    maxAge: 3600,
    dotfiles: "allow",
  });

  let requestHandler = createRequestHandler({
    build: fullOptions.build,
    mode: fullOptions.mode,
  });

  fastify.all("*", requestHandler);
};

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
}): RequestHandler {
  let handleRequest = createRemixRequestHandler(build, mode);

  return async (request, reply) => {
    let abortController = new AbortController();
    let remixRequest = createRemixRequest(request, abortController);
    let loadContext =
      typeof getLoadContext === "function"
        ? getLoadContext(request, reply)
        : undefined;

    let response = (await handleRequest(
      remixRequest as unknown as Request,
      loadContext
    )) as unknown as NodeResponse;

    sendRemixResponse(reply, response, abortController);
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
      headers.append(header, values);
    }
  }

  return headers;
}

export function createRemixRequest(
  request: FastifyRequest,
  abortController?: AbortController
): NodeRequest {
  let origin = `${request.protocol}://${request.hostname}`;
  let url = new URL(request.url, origin);

  let init: NodeRequestInit = {
    method: request.method,
    headers: createRemixHeaders(request.headers),
    signal: abortController?.signal,
    abortController,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body as NodeRequestInit["body"] | undefined;
  }

  return new NodeRequest(url.href, init);
}

export function sendRemixResponse(
  reply: FastifyReply,
  response: NodeResponse,
  abortController: AbortController
) {
  reply.status(response.status);

  for (const [key, values] of Object.entries(response.headers.raw())) {
    // fastify can accept array for set-cookie header
    // but for the rest we should use string
    if (key.toLowerCase() === "set-cookie") {
      reply.headers({ [key]: values });
    } else {
      reply.header(key, values.join("; "));
    }
  }

  if (abortController.signal.aborted) {
    reply.headers({ Connection: "close" });
  }

  if (Buffer.isBuffer(response.body)) {
    reply.send(response.body);
  } else if (response.body?.pipe) {
    response.body.pipe(reply.raw);
  } else {
    reply.send();
  }
}

export const remixFastifyPlugin = fp(remixFastify, {
  name: "remix-fastify",
  fastify: "^3.0.0",
});
