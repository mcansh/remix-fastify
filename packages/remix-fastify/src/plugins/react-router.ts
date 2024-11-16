import fp from "fastify-plugin";

import type { HttpServer } from "../shared";
import type { AppLoadContext, ServerBuild } from "react-router";
import { createRequestHandler } from "../servers/react-router";
import { createPlugin, type PluginOptions } from ".";

export type ReactRouterFastifyOptions = Omit<
  PluginOptions<HttpServer, AppLoadContext, ServerBuild>,
  "virtualModule"
>;

export const reactRouterFastify = fp<ReactRouterFastifyOptions>(
  async (fastify, options) => {
    let plugin = createPlugin(
      fastify,
      {
        ...options,
        virtualModule: "virtual:react-router/server-build",
      },
      createRequestHandler,
    );
    return plugin();
  },
  {
    // replaced with the package name during build
    name: process.env.__PACKAGE_NAME__,
    fastify: process.env.__FASTIFY_VERSION__,
  },
);
