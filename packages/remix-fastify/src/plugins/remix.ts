import fp from "fastify-plugin";
import type { AppLoadContext, ServerBuild } from "@remix-run/node";

import { createRemixRequestHandler } from "../servers/remix";
import type { HttpServer } from "../shared";
import { createPlugin, type PluginOptions } from ".";

export type RemixFastifyOptions = Omit<
  PluginOptions<HttpServer, AppLoadContext, ServerBuild>,
  "virtualModule"
>;

export const remixFastify = fp<RemixFastifyOptions>(
  async (fastify, options) => {
    let plugin = createPlugin(
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
