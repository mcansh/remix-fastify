import fastify from "fastify";
import * as serverBuild from "@remix-run/dev/server-build";
import { remixFastifyPlugin } from "@mcansh/remix-fastify";
import path from "path";

let MODE = process.env.NODE_ENV;

async function start() {
  try {
    let app = fastify();

    await app.register(remixFastifyPlugin, {
      assetsBuildDirectory: path.resolve(process.cwd(), "public", "build"),
      // @ts-expect-error hm, types are messed up
      build: serverBuild,
      mode: MODE,
      publicPath: "/build/",
    });

    let port = process.env.PORT || 3000;

    app.listen(port, "0.0.0.0", () => {
      console.log(`Fastify server listening on port ${port}`);
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

start();
