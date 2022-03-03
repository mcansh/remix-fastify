import path from "path";
import fastify from "fastify";
import sirv from "sirv";
import fastifyExpress from "fastify-express";
import { createRequestHandler } from "@mcansh/remix-fastify";

const MODE = process.env.NODE_ENV;
const BUILD_DIR = path.join(process.cwd(), "server/build");

async function start() {
  try {
    let app = fastify();

    app.addContentTypeParser("*", (_request, payload, done) => {
      let data = "";
      payload.on("data", (chunk) => {
        data += chunk;
      });
      payload.on("end", () => {
        done(null, data);
      });
    });

    await app.register(fastifyExpress);

    app.use(
      "/build",
      sirv("public/build", {
        dev: MODE !== "production",
        etag: true,
        dotfiles: true,
        maxAge: 31536000,
        immutable: true,
      })
    );

    app.use(
      sirv("public", {
        dev: MODE !== "production",
        etag: true,
        dotfiles: true,
        maxAge: 3600,
      })
    );

    app.all(
      "*",
      MODE === "production"
        ? createRequestHandler({ build: require("./build") })
        : (request, reply) => {
            purgeRequireCache();
            let build = require("./build");
            return createRequestHandler({ build, mode: MODE })(request, reply);
          }
    );

    let port = process.env.PORT || 3000;
    app.listen(port, "0.0.0", () => {
      console.log(`Fastify server listening on port ${port}`);
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

start();

////////////////////////////////////////////////////////////////////////////////
function purgeRequireCache() {
  // purge require cache on requests for "server side HMR" this won't let
  // you have in-memory objects between requests in development,
  // alternatively you can set up nodemon/pm2-dev to restart the server on
  // file changes, we prefer the DX of this though, so we've included it
  // for you by default
  for (let key in require.cache) {
    if (key.startsWith(BUILD_DIR)) {
      delete require.cache[key];
    }
  }
}
