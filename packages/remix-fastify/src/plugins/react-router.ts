import fp from "fastify-plugin";
import type { ServerBuild } from "react-router";

import type { HttpServer } from "../shared";

import { createPlugin } from ".";
import type { PluginOptions } from ".";

export type ReactRouterFastifyOptions = PluginOptions<HttpServer, ServerBuild>;

export const reactRouterFastify = fp<ReactRouterFastifyOptions>(
  async (fastify, options) => {
    let plugin = createPlugin(fastify, options);
    await plugin();
  },
  {
    // replaced with the package name during build
    name: process.env.__PACKAGE_NAME__,
    fastify: process.env.__FASTIFY_VERSION__,
  },
);
