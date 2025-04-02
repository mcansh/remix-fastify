import fp from "fastify-plugin";
import type { AppLoadContext, ServerBuild } from "react-router";

import { createReactRouterRequestHandler } from "../servers/react-router";
import type { HttpServer } from "../shared";

import { createPlugin } from ".";
import type { PluginOptions } from ".";

export type ReactRouterFastifyOptions = Omit<
  PluginOptions<HttpServer, AppLoadContext, ServerBuild>,
  "virtualModule"
>;

export const reactRouterFastify = fp<ReactRouterFastifyOptions>(
  async (fastify, options) => {
    let plugin = createPlugin(
      // @ts-expect-error
      fastify,
      options,
      "virtual:react-router/server-build",
      createReactRouterRequestHandler,
    );
    return plugin();
  },
  {
    // replaced with the package name during build
    name: process.env.__PACKAGE_NAME__,
    fastify: process.env.__FASTIFY_VERSION__,
  },
);
