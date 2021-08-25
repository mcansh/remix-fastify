const path = require("path");
const fastify = require("fastify");
const fastifyStatic = require("fastify-static");
const { createRequestHandler } = require("@mcansh/remix-fastify");

const BUILD_DIR = ".build";
const MODE = process.env.NODE_ENV;

let app = fastify({ logger: { level: "trace" } });

app.register(fastifyStatic, {
  root: path.join(process.cwd(), "public"),
  prefix: "/static",
});

console.log(path.join(process.cwd(), "public"));

app.all("*", createRequestHandler({ build: require("./build") }));

let port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Fastify server listening on port ${port}`);
});

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
