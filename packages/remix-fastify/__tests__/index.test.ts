import { Readable } from "stream";
import type { FastifyReply } from "fastify";
import fastify from "fastify";
import { createRequest } from "node-mocks-http";
import {
  createReadableStreamFromReadable,
  createRequestHandler as createRemixRequestHandler,
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
  let original =
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    await vi.importActual<typeof import("@remix-run/node")>("@remix-run/node");
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
        let readable = Readable.from("hello world");
        let stream = createReadableStreamFromReadable(readable);
        return new Response(stream, { status: 200 });
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
      let headers = createRemixHeaders({});
      expect(Array.from(headers.keys())).toHaveLength(0);
    });

    it("handles simple headers", () => {
      let headers = createRemixHeaders({ "x-foo": "bar" });
      expect(headers.get("x-foo")).toBe("bar");
    });

    it("handles multiple headers", () => {
      let headers = createRemixHeaders({ "x-foo": "bar", "x-bar": "baz" });
      expect(headers.get("x-foo")).toBe("bar");
    });

    it("handles headers with multiple values", () => {
      let headers = createRemixHeaders({ "x-foo": "bar, baz" });
      expect(headers.get("x-foo")).toBe("bar, baz");
    });

    it("handles headers with multiple values and multiple headers", () => {
      let headers = createRemixHeaders({ "x-foo": "bar, baz", "x-bar": "baz" });
      expect(headers.get("x-foo")).toBe("bar, baz");
      expect(headers.get("x-bar")).toBe("baz");
    });

    it("handles multiple set-cookie headers", () => {
      let headers = createRemixHeaders({
        "set-cookie": [
          "__session=some_value; Path=/; Secure; HttpOnly; MaxAge=7200; SameSite=Lax",
          "__other=some_other_value; Path=/; Secure; HttpOnly; MaxAge=3600; SameSite=Lax",
        ],
      });

      expect(headers.get("set-cookie")).toBe(
        "__session=some_value; Path=/; Secure; HttpOnly; MaxAge=7200; SameSite=Lax, __other=some_other_value; Path=/; Secure; HttpOnly; MaxAge=3600; SameSite=Lax",
      );
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

    let request = createRemixRequest(fastifyRequest, fastifyReply);

    expect(request.headers.get("cache-control")).toBe(
      "max-age=300, s-maxage=3600",
    );
    expect(request.headers.get("host")).toBe("localhost:3000");
  });
});
