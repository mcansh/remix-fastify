import type { AppLoadContext, ServerBuild } from "@remix-run/node";
import fp from "fastify-plugin";

import { createRemixRequestHandler } from "../servers/remix";
import type { HttpServer } from "../shared";

import type { PluginOptions } from ".";
import { createPlugin } from ".";

export type RemixFastifyOptions = Omit<
  PluginOptions<HttpServer, AppLoadContext, ServerBuild>,
  "virtualModule" | 'allowedActionOrigins'
>;

export const remixFastify = fp<RemixFastifyOptions>(
  async (fastify, options) => {
    let plugin = createPlugin(
      fastify,
      options,
      "virtual:remix/server-build",
      createRemixRequestHandler,
    );
    await plugin();
  },
  {
    // replaced with the package name during build
    name: process.env.__PACKAGE_NAME__,
    fastify: process.env.__FASTIFY_VERSION__,
  },
);
