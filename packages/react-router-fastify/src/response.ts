import { Readable } from "node:stream"

import type { FastifyReply } from "fastify"

/**
 * Writes a Web Fetch `Response` through a Fastify reply.
 *
 * @param reply Fastify reply.
 * @param response React Router response.
 * @returns A promise that settles after the response is sent.
 */
export async function sendResponse(
  reply: FastifyReply,
  response: Response,
): Promise<void> {
  reply.status(response.status)
  writeHeaders(reply, response.headers)

  if (response.body == null) {
    return reply.send()
  }

  return reply.send(readableFromWeb(response.body))
}

function writeHeaders(reply: FastifyReply, headers: Headers): void {
  let cookies = readSetCookies(headers)

  for (let [name, value] of headers) {
    if (name.toLowerCase() === "set-cookie" && cookies.length > 0) continue
    reply.header(name, value)
  }

  if (cookies.length > 0) {
    reply.header("set-cookie", cookies)
  }
}

function readSetCookies(headers: Headers): string[] {
  let withCookies = headers as Headers & { getSetCookie?: () => string[] }
  let cookies = withCookies.getSetCookie?.()
  if (cookies && cookies.length > 0) return cookies

  let cookie = headers.get("Set-Cookie")
  return cookie ? [cookie] : []
}

function readableFromWeb(body: ReadableStream<Uint8Array>): Readable {
  let reader = body.getReader()

  return new Readable({
    read() {
      reader.read().then(
        ({ done, value }) => {
          this.push(done ? null : Buffer.from(value))
        },
        (error: unknown) => {
          this.destroy(
            error instanceof Error ? error : new Error(String(error)),
          )
        },
      )
    },
  })
}
