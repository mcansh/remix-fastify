import { createReadableStreamFromReadable } from "@react-router/node";
import type { FastifyReply, FastifyRequest } from "fastify";
import fastify from "fastify";
import { createRequest as createMockRequest } from "node-mocks-http";
import { Readable } from "node:stream";
import type * as ReactRouter from "react-router";
import { createRequestHandler as createReactRouterRequestHandlerImpl } from "react-router";
import type { MockedFunction } from "vitest";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { createHeaders, createRequest, createRequestHandler } from "./server.ts";

// We don't want to test that React Router works here (that's what the e2e tests
// do), we just want to test the fastify adapter
vi.mock("react-router", async () => {
  let original = await vi.importActual<typeof ReactRouter>("react-router");
  return {
    ...original,
    createRequestHandler: vi.fn(),
  };
});

const mockedCreateRequestHandler = createReactRouterRequestHandlerImpl as MockedFunction<
  typeof createReactRouterRequestHandlerImpl
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
  afterEach(() => {
    mockedCreateRequestHandler.mockReset();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("handles requests", async () => {
    mockedCreateRequestHandler.mockImplementation(
      () => async (req) => new Response(`URL: ${new URL(req.url).pathname}`),
    );

    let app = createApp();
    let response = await app.inject("/foo/bar");

    expect(response.body).toBe("URL: /foo/bar");
    expect(response.statusCode).toBe(200);
  });

  it("handles root // URLs", async () => {
    mockedCreateRequestHandler.mockImplementation(
      () => async (req) => new Response(`URL: ${new URL(req.url).pathname}`),
    );

    let app = createApp();
    let response = await app.inject("//");

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe("URL: //");
  });

  it("handles nested // URLs", async () => {
    mockedCreateRequestHandler.mockImplementation(
      () => async (req) => new Response(`URL: ${new URL(req.url).pathname}`),
    );

    let app = createApp();
    let response = await app.inject("//foo//bar");

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe("URL: //foo//bar");
  });

  it("handles null body", async () => {
    mockedCreateRequestHandler.mockImplementation(() => async () => new Response(null));

    let app = createApp();
    let response = await app.inject("/");

    expect(response.statusCode).toBe(200);
  });

  // https://github.com/node-fetch/node-fetch/blob/4ae35388b078bddda238277142bf091898ce6fda/test/response.js#L142-L148
  it("handles body as stream", async () => {
    mockedCreateRequestHandler.mockImplementation(() => async () => {
      let readable = Readable.from("hello world");
      let stream = createReadableStreamFromReadable(readable);
      return new Response(stream);
    });

    let app = createApp();
    let response = await app.inject("/");

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe("hello world");
  });

  it("handles status codes", async () => {
    mockedCreateRequestHandler.mockImplementation(
      () => async () => new Response(null, { status: 204 }),
    );

    let app = createApp();
    let response = await app.inject("/");

    expect(response.statusCode).toBe(204);
  });

  it("sets headers", async () => {
    mockedCreateRequestHandler.mockImplementation(() => async () => {
      let headers = new Headers({ "X-Time-Of-Year": "most wonderful" });
      headers.append("Set-Cookie", "first=one; Expires=0; Path=/; HttpOnly; Secure; SameSite=Lax");
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
    let response = await app.inject("/");

    expect(response.headers["x-time-of-year"]).toBe("most wonderful");
    expect(response.headers["set-cookie"]).toEqual([
      "first=one; Expires=0; Path=/; HttpOnly; Secure; SameSite=Lax",
      "second=two; MaxAge=1209600; Path=/; HttpOnly; Secure; SameSite=Lax",
      "third=three; Expires=Wed, 21 Oct 2015 07:28:00 GMT; Path=/; HttpOnly; Secure; SameSite=Lax",
    ]);
  });
});

describe("fastify createHeaders", () => {
  it("handles empty headers", () => {
    let headers = createHeaders({});
    expect(Array.from(headers.keys())).toHaveLength(0);
  });

  it("handles simple headers", () => {
    let headers = createHeaders({ "x-foo": "bar" });
    expect(headers.get("X-Foo")).toBe("bar");
  });

  it("handles multiple headers", () => {
    let headers = createHeaders({ "x-foo": "bar", "x-bar": "baz" });
    expect(headers.get("X-Foo")).toBe("bar");
  });

  it("handles headers with multiple values", () => {
    let headers = createHeaders({ "x-foo": "bar, baz" });
    expect(headers.get("X-Foo")).toBe("bar, baz");
  });

  it("handles headers with multiple values and multiple headers", () => {
    let headers = createHeaders({ "x-foo": "bar, baz", "x-bar": "baz" });
    expect(headers.get("X-Foo")).toBe("bar, baz");
    expect(headers.get("X-Bar")).toBe("baz");
  });

  it("handles multiple set-cookie headers", () => {
    let headers = createHeaders({
      "set-cookie": [
        "__session=some_value; Path=/; Secure; HttpOnly; MaxAge=7200; SameSite=Lax",
        "__other=some_other_value; Path=/; Secure; HttpOnly; MaxAge=3600; SameSite=Lax",
      ],
    });

    expect(headers.get("Set-Cookie")).toBe(
      "__session=some_value; Path=/; Secure; HttpOnly; MaxAge=7200; SameSite=Lax, __other=some_other_value; Path=/; Secure; HttpOnly; MaxAge=3600; SameSite=Lax",
    );
  });
});

describe("fastify createRequest", () => {
  it("creates a request with the correct headers", async () => {
    let fastifyRequest = createMockRequest({
      url: "/foo/bar",
      method: "GET",
      protocol: "http",
      hostname: "localhost:3000",
      headers: {
        "Cache-Control": "max-age=300, s-maxage=3600",
        Host: "localhost:3000",
      },
    }) as unknown as FastifyRequest;

    let fastifyReply = { raw: { on: vi.fn() } } as unknown as FastifyReply;

    let request = createRequest(fastifyRequest, fastifyReply);

    expect(request.headers.get("Cache-Control")).toBe("max-age=300, s-maxage=3600");
    expect(request.headers.get("Host")).toBe("localhost:3000");
  });
});
