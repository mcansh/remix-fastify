import fastify from "fastify";
import sirv from "sirv";
import fastifyExpress from "fastify-express";
import { createRequestHandler } from "@mcansh/remix-fastify";
import * as serverBuild from "@remix-run/dev/server-build";

let MODE = process.env.NODE_ENV;

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

    app.all("*", createRequestHandler({ build: serverBuild }));

    let port = process.env.PORT || 3000;

    await app.listen(port, "0.0.0.0", () => {
      console.log(`Fastify server listening on port ${port}`);
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

start();
