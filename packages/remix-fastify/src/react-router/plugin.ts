import fp from "fastify-plugin";
import type { AppLoadContext, ServerBuild } from "react-router";

import { createReactRouterRequestHandler } from "./server.ts";
import type { HttpServer } from "../shared-server.ts";

import { createPlugin } from "../shared-plugin.ts";
import type { PluginOptions } from "../shared-plugin.ts";

export type ReactRouterFastifyOptions = Omit<
  PluginOptions<HttpServer, AppLoadContext, ServerBuild>,
  "virtualModule"
>;

export const reactRouterFastify = fp<ReactRouterFastifyOptions>(
  async (fastify, options) => {
    let plugin = createPlugin(
      fastify,
      options,
      "virtual:react-router/server-build",
      createReactRouterRequestHandler,
    );
    await plugin();
  },
  {
    // replaced with the package name during build
    name: process.env.__PACKAGE_NAME__,
    fastify: process.env.__FASTIFY_VERSION__,
  },
);
