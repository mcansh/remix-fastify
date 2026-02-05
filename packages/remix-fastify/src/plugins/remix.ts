import type { AppLoadContext, ServerBuild } from "@remix-run/node";
import fp from "fastify-plugin";

import { createRemixRequestHandler } from "../servers/remix";
import type { HttpServer } from "../shared";

import { createPlugin } from ".";
import type { PluginOptions } from ".";

export type RemixFastifyOptions = PluginOptions<
  HttpServer,
  AppLoadContext,
  ServerBuild
>;

export const remixFastify = fp<RemixFastifyOptions>(
  async (fastify, options) => {
    let plugin = createPlugin(
      fastify,
      {
        ...options,
        serverBuildImport:
          options.serverBuildImport ??
          (() => import("virtual:remix/server-build")),
      },
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
