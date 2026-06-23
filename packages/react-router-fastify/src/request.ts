import { Readable } from "node:stream"

import { createReadableStreamFromReadable } from "@react-router/node"
import type { FastifyReply, FastifyRequest } from "fastify"

/**
 * Copies Fastify's normalized request headers into Web Fetch `Headers`.
 *
 * @param source Fastify request headers.
 * @returns Fetch-compatible headers.
 */
export function createHeaders(source: FastifyRequest["headers"]): Headers {
  let headers = new Headers()

  for (let [name, value] of Object.entries(source)) {
    if (value == null) continue

    if (Array.isArray(value)) {
      for (let item of value) {
        headers.append(name, item)
      }
    } else {
      headers.set(name, value)
    }
  }

  return headers
}

/**
 * Builds the absolute request URL that React Router expects.
 *
 * @param request Fastify request.
 * @returns Absolute URL for the original incoming request.
 */
export function createUrl(request: FastifyRequest): string {
  return `${request.protocol}://${request.host}${request.originalUrl}`
}

/**
 * Adapts a Fastify request to a Web Fetch `Request`.
 *
 * @param request Fastify request.
 * @param reply Fastify reply, used to abort work when the connection closes.
 * @returns Fetch-compatible request for React Router.
 */
export function createRequest(
  request: FastifyRequest,
  reply: FastifyReply,
): Request {
  let controller: AbortController | null = new AbortController()

  let init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers: createHeaders(request.headers),
    signal: controller.signal,
  }

  reply.raw.once("finish", () => {
    controller = null
  })
  reply.raw.once("close", () => {
    controller?.abort()
  })

  if (["GET", "HEAD"].includes(request.method) === false) {
    init.body = getBody(request)
    init.duplex = "half"
  }

  return new Request(createUrl(request), init)
}

function getBody(request: FastifyRequest): BodyInit | null {
  let body = request.body

  if (body == null) return createReadableStreamFromReadable(request.raw)
  if (body instanceof Readable) return createReadableStreamFromReadable(body)
  if (body instanceof ReadableStream) return body
  if (body instanceof URLSearchParams) return body
  if (body instanceof ArrayBuffer) return body
  if (body instanceof Blob) return body
  if (body instanceof FormData) return body
  if (ArrayBuffer.isView(body)) {
    return new Uint8Array(
      body.buffer as ArrayBuffer,
      body.byteOffset,
      body.byteLength,
    )
  }
  if (typeof body === "string") return body

  return JSON.stringify(body)
}
