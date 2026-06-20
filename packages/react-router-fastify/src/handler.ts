import type { FastifyReply, FastifyRequest } from "fastify"
import type { RouterContextProvider, ServerBuild } from "react-router"
import { createRequestHandler as createReactRouterHandler } from "react-router"

import { createRequest } from "./request.ts"
import { sendResponse } from "./response.ts"

export type HttpRequest = FastifyRequest["raw"]
export type HttpResponse = FastifyReply["raw"]

export type ReactRouterLoadContext = RouterContextProvider

export type GetLoadContextFunction = (
  request: FastifyRequest,
  reply: FastifyReply,
) =>
  | ReactRouterLoadContext
  | undefined
  | Promise<ReactRouterLoadContext | undefined>

export type RequestHandler = (
  request: FastifyRequest,
  reply: FastifyReply,
) => Promise<void>

export interface CreateRequestHandlerOptions {
  build: ServerBuild | (() => ServerBuild | Promise<ServerBuild>)
  getLoadContext?: GetLoadContextFunction
  mode?: string
}

/**
 * Creates a Fastify route handler backed by React Router's server runtime.
 *
 * @param options React Router build, mode, and optional load context hook.
 * @returns Fastify route handler.
 */
export function createRequestHandler(
  options: CreateRequestHandlerOptions,
): RequestHandler {
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
