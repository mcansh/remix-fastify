import type {
  FastifyReply,
  FastifyRequest,
  RawServerBase,
  RawServerDefault,
} from "fastify"
import type { RouterContextProvider, ServerBuild } from "react-router"
import { createRequestHandler as createReactRouterHandler } from "react-router"

import { createRequest } from "./request.ts"
import type { AdapterReply, AdapterRequest } from "./request.ts"
import { sendResponse } from "./response.ts"

export type HttpRequest = FastifyRequest["raw"]
export type HttpResponse = FastifyReply["raw"]

export type ReactRouterLoadContext = RouterContextProvider

export type GetLoadContextFunction<
  RawServer extends RawServerBase = RawServerDefault,
> = (
  request: AdapterRequest<RawServer>,
  reply: AdapterReply<RawServer>,
) =>
  | ReactRouterLoadContext
  | undefined
  | Promise<ReactRouterLoadContext | undefined>

export type RequestHandler<RawServer extends RawServerBase = RawServerDefault> =
  (
    request: AdapterRequest<RawServer>,
    reply: AdapterReply<RawServer>,
  ) => Promise<void>

export interface CreateRequestHandlerOptions<
  RawServer extends RawServerBase = RawServerDefault,
> {
  build: ServerBuild | (() => ServerBuild | Promise<ServerBuild>)
  getLoadContext?: GetLoadContextFunction<RawServer>
  mode?: string
}

/**
 * Creates a Fastify route handler backed by React Router's server runtime.
 *
 * Works with HTTP/1, HTTPS, and HTTP/2 servers. Passed straight to a route, the
 * server type is inferred from the app. When the handler is created before the
 * route, pass the server type yourself, for example
 * `createRequestHandler<Http2Server>({ build })`.
 *
 * @param options React Router build, mode, and optional load context hook.
 * @returns Fastify route handler.
 */
export function createRequestHandler<
  RawServer extends RawServerBase = RawServerDefault,
>(options: CreateRequestHandlerOptions<RawServer>): RequestHandler<RawServer> {
  let reactRouterHandler = createReactRouterHandler(
    options.build,
    options.mode ?? process.env.NODE_ENV,
  )

  return async (request, reply) => {
    let webRequest = createRequest(request, reply)
    let context = await options.getLoadContext?.(request, reply)
    let webResponse = await reactRouterHandler(webRequest, context)
    await sendResponse(reply, webResponse)
  }
}
