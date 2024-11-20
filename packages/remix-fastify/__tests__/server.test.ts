import { Readable } from "stream";
import type { FastifyReply, FastifyRequest } from "fastify";
import fastify from "fastify";
import { createRequest as createMockRequest } from "node-mocks-http";
import {
  createReadableStreamFromReadable as remixCreateReadableStreamFromReadable,
  createRequestHandler as createRemixRequestHandlerImpl,
} from "@remix-run/node";
import { createRequestHandler as createReactRouterRequestHandlerImpl } from "react-router";
import { createReadableStreamFromReadable as reactRouterCreateReadableStreamFromReadable } from "@react-router/node";
import type { MockedFunction } from "vitest";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import {
  createRemixRequest,
  createRemixRequestHandler,
} from "../src/servers/remix";
import {
  createReactRouterRequest,
  createReactRouterRequestHandler,
} from "../src/servers/react-router";
import { createHeaders } from "../src/shared";

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
// We don't want to test that the remix server works here (that's what the
// playwright tests do), we just want to test the fastify adapter
vi.mock("react-router", () => {
  let original = vi.importActual("react-router");
  return {
    ...original,
    createRequestHandler: vi.fn(),
  };
});

let mockedRemixCreateRequestHandler =
  createRemixRequestHandlerImpl as MockedFunction<
    typeof createRemixRequestHandlerImpl
  >;
let mockedReactRouterCreateRequestHandler =
  createReactRouterRequestHandlerImpl as MockedFunction<
    typeof createReactRouterRequestHandlerImpl
  >;

type MockedCreateRequestHandler =
  | typeof mockedRemixCreateRequestHandler
  | typeof mockedReactRouterCreateRequestHandler;

type CreateReadableStreamFromReadable =
  | typeof remixCreateReadableStreamFromReadable
  | typeof reactRouterCreateReadableStreamFromReadable;

function runTests(
  name: string,
  {
    createRequest,
    createRequestHandler,
    createReadableStreamFromReadable,
    mockedHandler,
  }: {
    createRequest: typeof createRemixRequest | typeof createReactRouterRequest;
    createRequestHandler:
      | typeof createRemixRequestHandler
      | typeof createReactRouterRequestHandler;
    mockedHandler: MockedCreateRequestHandler;
    createReadableStreamFromReadable: CreateReadableStreamFromReadable;
  },
) {
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

  describe(`[${name}] fastify createRequestHandler`, () => {
    describe(`[${name}] basic requests`, () => {
      afterEach(() => {
        mockedHandler.mockReset();
      });

      afterAll(() => {
        vi.restoreAllMocks();
      });

      it(`[${name}] handles requests`, async () => {
        mockedHandler.mockImplementation(() => async (req) => {
          return new Response(`URL: ${new URL(req.url).pathname}`);
        });

        let app = createApp();

        let response = await app.inject("/foo/bar");

        expect(response.body).toBe("URL: /foo/bar");
        expect(response.statusCode).toBe(200);
      });

      it(`[${name}] handles root // URLs`, async () => {
        mockedHandler.mockImplementation(() => async (req) => {
          return new Response(`URL: ${new URL(req.url).pathname}`);
        });

        let app = createApp();

        let response = await app.inject("//");

        expect(response.statusCode).toBe(200);
        expect(response.body).toBe("URL: //");
      });

      it(`[${name}] handles nested // URLs`, async () => {
        mockedHandler.mockImplementation(() => async (req) => {
          return new Response(`URL: ${new URL(req.url).pathname}`);
        });

        let app = createApp();

        let response = await app.inject("//foo//bar");

        expect(response.statusCode).toBe(200);
        expect(response.body).toBe("URL: //foo//bar");
      });

      it(`[${name}] handles null body`, async () => {
        mockedHandler.mockImplementation(() => async () => {
          return new Response(null);
        });

        let app = createApp();

        let response = await app.inject("/");

        expect(response.statusCode).toBe(200);
      });

      // https://github.com/node-fetch/node-fetch/blob/4ae35388b078bddda238277142bf091898ce6fda/test/response.js#L142-L148
      it(`[${name}] handles body as stream`, async () => {
        mockedHandler.mockImplementation(() => async () => {
          let readable = Readable.from("hello world");
          let stream = createReadableStreamFromReadable(readable);
          return new Response(stream);
        });

        let app = createApp();
        let response = await app.inject("/");

        expect(response.statusCode).toBe(200);
        expect(response.body).toBe("hello world");
      });

      it(`[${name}] handles status codes`, async () => {
        mockedHandler.mockImplementation(() => async () => {
          return new Response(null, { status: 204 });
        });

        let app = createApp();
        let response = await app.inject("/");

        expect(response.statusCode).toBe(204);
      });

      it(`[${name}] sets headers`, async () => {
        mockedHandler.mockImplementation(() => async () => {
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
        let response = await app.inject("/");

        expect(response.headers["x-time-of-year"]).toBe("most wonderful");
        expect(response.headers["set-cookie"]).toEqual([
          "first=one; Expires=0; Path=/; HttpOnly; Secure; SameSite=Lax",
          "second=two; MaxAge=1209600; Path=/; HttpOnly; Secure; SameSite=Lax",
          "third=three; Expires=Wed, 21 Oct 2015 07:28:00 GMT; Path=/; HttpOnly; Secure; SameSite=Lax",
        ]);
      });
    });
  });

  describe(`[${name}] fastify createHeaders`, () => {
    describe(`[${name}] creates fetch headers from fastify headers`, () => {
      it(`[${name}] handles empty headers`, () => {
        let headers = createHeaders({});
        expect(Array.from(headers.keys())).toHaveLength(0);
      });

      it(`[${name}] handles simple headers`, () => {
        let headers = createHeaders({ "x-foo": "bar" });
        expect(headers.get("x-foo")).toBe("bar");
      });

      it(`[${name}] handles multiple headers`, () => {
        let headers = createHeaders({ "x-foo": "bar", "x-bar": "baz" });
        expect(headers.get("x-foo")).toBe("bar");
      });

      it(`[${name}] handles headers with multiple values`, () => {
        let headers = createHeaders({ "x-foo": "bar, baz" });
        expect(headers.get("x-foo")).toBe("bar, baz");
      });

      it(`[${name}] handles headers with multiple values and multiple headers`, () => {
        let headers = createHeaders({ "x-foo": "bar, baz", "x-bar": "baz" });
        expect(headers.get("x-foo")).toBe("bar, baz");
        expect(headers.get("x-bar")).toBe("baz");
      });

      it(`[${name}] handles multiple set-cookie headers`, () => {
        let headers = createHeaders({
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

  describe(`[${name}] fastify createRequest`, () => {
    it(`[${name}] creates a request with the correct headers`, async () => {
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

      expect(request.headers.get("cache-control")).toBe(
        "max-age=300, s-maxage=3600",
      );
      expect(request.headers.get("host")).toBe("localhost:3000");
    });
  });
}

runTests("remix", {
  createRequest: createRemixRequest,
  createRequestHandler: createRemixRequestHandler,
  mockedHandler: mockedRemixCreateRequestHandler,
  createReadableStreamFromReadable: remixCreateReadableStreamFromReadable,
});
runTests("react-router", {
  createRequest: createReactRouterRequest,
  createRequestHandler: createReactRouterRequestHandler,
  mockedHandler: mockedReactRouterCreateRequestHandler,
  createReadableStreamFromReadable: reactRouterCreateReadableStreamFromReadable,
});
