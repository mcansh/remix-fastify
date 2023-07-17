import { Readable } from "stream";
import type { FastifyReply } from "fastify";
import fastify from "fastify";
import { createRequest } from "node-mocks-http";
import {
  createRequestHandler as createRemixRequestHandler,
  Response as NodeResponse,
} from "@remix-run/node";
import "@remix-run/node/install";
import type { MockedFunction } from "vitest";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import {
  createRemixHeaders,
  createRemixRequest,
  createRequestHandler,
} from "../src/server";

// We don't want to test that the remix server works here (that's what the
// playwright tests do), we just want to test the fastify adapter
vi.mock("@remix-run/node", async () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  let original = await vi.importActual<typeof import("@remix-run/node")>(
    "@remix-run/node",
  );
  return {
    ...original,
    createRequestHandler: vi.fn(),
  };
});
let mockedCreateRequestHandler = createRemixRequestHandler as MockedFunction<
  typeof createRemixRequestHandler
>;

function createApp() {
  let app = fastify();

  app.all(
    "*",
    createRequestHandler({
      // We don't have a real app to test, but it doesn't matter. We
      // won't ever call through to the real createRequestHandler
      // @ts-expect-error
      build: undefined,
    }),
  );

  return app;
}

describe("fastify createRequestHandler", () => {
  describe("basic requests", () => {
    afterEach(() => {
      mockedCreateRequestHandler.mockReset();
    });

    afterAll(() => {
      vi.restoreAllMocks();
    });

    it("handles requests", async () => {
      mockedCreateRequestHandler.mockImplementation(() => async (req) => {
        return new Response(`URL: ${new URL(req.url).pathname}`);
      });

      let app = createApp();

      let response = await app.inject("/foo/bar");

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe("URL: /foo/bar");
    });

    it("handles root // URLs", async () => {
      mockedCreateRequestHandler.mockImplementation(() => async (req) => {
        return new Response("URL: " + new URL(req.url).pathname);
      });

      let app = createApp();

      let response = await app.inject("//");

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe("URL: //");
    });

    it("handles nested // URLs", async () => {
      mockedCreateRequestHandler.mockImplementation(() => async (req) => {
        return new Response("URL: " + new URL(req.url).pathname);
      });

      let app = createApp();

      let response = await app.inject("//foo//bar");

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe("URL: //foo//bar");
    });

    it("handles null body", async () => {
      mockedCreateRequestHandler.mockImplementation(() => async () => {
        return new Response(null, { status: 200 });
      });

      let app = createApp();

      let response = await app.inject("/");

      expect(response.statusCode).toBe(200);
    });

    // https://github.com/node-fetch/node-fetch/blob/4ae35388b078bddda238277142bf091898ce6fda/test/response.js#L142-L148
    it("handles body as stream", async () => {
      mockedCreateRequestHandler.mockImplementation(() => async () => {
        let stream = Readable.from("hello world");
        return new NodeResponse(stream, { status: 200 });
      });

      let app = createApp();
      let response = await app.inject("/");

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe("hello world");
    });

    it("handles status codes", async () => {
      mockedCreateRequestHandler.mockImplementation(() => async () => {
        return new Response(null, { status: 204 });
      });

      let app = createApp();
      let res = await app.inject("/");

      expect(res.statusCode).toBe(204);
    });

    it("sets headers", async () => {
      mockedCreateRequestHandler.mockImplementation(() => async () => {
        let headers = new Headers({ "X-Time-Of-Year": "most wonderful" });
        headers.append(
          "Set-Cookie",
          "first=one; Expires=0; Path=/; HttpOnly; Secure; SameSite=Lax",
        );
        headers.append(
          "Set-Cookie",
          "second=two; MaxAge=1209600; Path=/; HttpOnly; Secure; SameSite=Lax",
        );
        headers.append(
          "Set-Cookie",
          "third=three; Expires=Wed, 21 Oct 2015 07:28:00 GMT; Path=/; HttpOnly; Secure; SameSite=Lax",
        );
        return new Response(null, { headers });
      });

      let app = createApp();
      let res = await app.inject("/");

      expect(res.headers["x-time-of-year"]).toBe("most wonderful");
      expect(res.headers["set-cookie"]).toEqual([
        "first=one; Expires=0; Path=/; HttpOnly; Secure; SameSite=Lax",
        "second=two; MaxAge=1209600; Path=/; HttpOnly; Secure; SameSite=Lax",
        "third=three; Expires=Wed, 21 Oct 2015 07:28:00 GMT; Path=/; HttpOnly; Secure; SameSite=Lax",
      ]);
    });
  });
});

describe("fastify createRemixHeaders", () => {
  describe("creates fetch headers from fastify headers", () => {
    it("handles empty headers", () => {
      expect(createRemixHeaders({})).toMatchInlineSnapshot(`
        Headers {
          Symbol(query): [],
          Symbol(context): null,
        }
      `);
    });

    it("handles simple headers", () => {
      expect(createRemixHeaders({ "x-foo": "bar" })).toMatchInlineSnapshot(`
        Headers {
          Symbol(query): [
            "x-foo",
            "bar",
          ],
          Symbol(context): null,
        }
      `);
    });

    it("handles multiple headers", () => {
      expect(createRemixHeaders({ "x-foo": "bar", "x-bar": "baz" }))
        .toMatchInlineSnapshot(`
        Headers {
          Symbol(query): [
            "x-foo",
            "bar",
            "x-bar",
            "baz",
          ],
          Symbol(context): null,
        }
      `);
    });

    it("handles headers with multiple values", () => {
      expect(createRemixHeaders({ "x-foo": "bar, baz" }))
        .toMatchInlineSnapshot(`
        Headers {
          Symbol(query): [
            "x-foo",
            "bar, baz",
          ],
          Symbol(context): null,
        }
      `);
    });

    it("handles headers with multiple values and multiple headers", () => {
      expect(createRemixHeaders({ "x-foo": "bar, baz", "x-bar": "baz" }))
        .toMatchInlineSnapshot(`
        Headers {
          Symbol(query): [
            "x-foo",
            "bar, baz",
            "x-bar",
            "baz",
          ],
          Symbol(context): null,
        }
      `);
    });

    it("handles multiple set-cookie headers", () => {
      expect(
        createRemixHeaders({
          "set-cookie": [
            "__session=some_value; Path=/; Secure; HttpOnly; MaxAge=7200; SameSite=Lax",
            "__other=some_other_value; Path=/; Secure; HttpOnly; MaxAge=3600; SameSite=Lax",
          ],
        }),
      ).toMatchInlineSnapshot(`
        Headers {
          Symbol(query): [
            "set-cookie",
            "__session=some_value; Path=/; Secure; HttpOnly; MaxAge=7200; SameSite=Lax",
            "set-cookie",
            "__other=some_other_value; Path=/; Secure; HttpOnly; MaxAge=3600; SameSite=Lax",
          ],
          Symbol(context): null,
        }
      `);
    });
  });
});

describe("fastify createRemixRequest", () => {
  it("creates a request with the correct headers", async () => {
    let fastifyRequest = createRequest({
      url: "/foo/bar",
      method: "GET",
      protocol: "http",
      hostname: "localhost:3000",
      headers: {
        "Cache-Control": "max-age=300, s-maxage=3600",
        Host: "localhost:3000",
      },
    });

    let fastifyReply = { raw: { on: vi.fn() } } as unknown as FastifyReply;

    expect(createRemixRequest(fastifyRequest, fastifyReply))
      .toMatchInlineSnapshot(`
      NodeRequest {
        "agent": undefined,
        "compress": true,
        "counter": 0,
        "follow": 20,
        "highWaterMark": 16384,
        "insecureHTTPParser": false,
        "size": 0,
        Symbol(Body internals): {
          "body": null,
          "boundary": null,
          "disturbed": false,
          "error": null,
          "size": 0,
          "type": null,
        },
        Symbol(Request internals): {
          "credentials": "same-origin",
          "headers": Headers {
            Symbol(query): [
              "cache-control",
              "max-age=300, s-maxage=3600",
              "host",
              "localhost:3000",
            ],
            Symbol(context): null,
          },
          "method": "GET",
          "parsedURL": "http://localhost:3000/foo/bar",
          "redirect": "follow",
          "signal": AbortSignal {},
        },
      }
    `);
  });
});
