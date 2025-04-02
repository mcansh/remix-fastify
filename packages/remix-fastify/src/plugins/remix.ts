import type { AppLoadContext, ServerBuild } from "@remix-run/node";
import fp from "fastify-plugin";

import { createRemixRequestHandler } from "../servers/remix";
import type { HttpServer } from "../shared";

import { createPlugin } from ".";
import type { PluginOptions } from ".";

export type RemixFastifyOptions = Omit<
  PluginOptions<HttpServer, AppLoadContext, ServerBuild>,
  "virtualModule"
>;

export const remixFastify = fp<RemixFastifyOptions>(
  async (fastify, options) => {
    let plugin = createPlugin(
      // @ts-expect-error
      fastify,
      options,
      "virtual:remix/server-build",
      createRemixRequestHandler,
    );
    return plugin();
  },
  {
    // replaced with the package name during build
    name: process.env.__PACKAGE_NAME__,
    fastify: process.env.__FASTIFY_VERSION__,
  },
);
