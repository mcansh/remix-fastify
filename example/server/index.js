const path = require("path");
const fastify = require("fastify");
const fastifyStatic = require("fastify-static");
const { createRequestHandler } = require("@mcansh/remix-fastify");

const MODE = process.env.NODE_ENV;
const BUILD_DIR = path.join(process.cwd(), "server/build");

console.log({ MODE });

let app = fastify();

/**
 * @type {import('fastify').AddContentTypeParser}
 */
app.addContentTypeParser("*", (request, payload, done) => {
  let data = "";
  payload.on("data", (chunk) => {
    data += chunk;
  });
  payload.on("end", () => {
    done(null, data);
  });
});

app.register(fastifyStatic, {
  root: path.join(process.cwd(), "public"),
  prefix: "/static",
});

/**
 * @type {import('fastify').RouteHandler}
 */
app.all(
  "*",
  MODE === "production"
    ? createRequestHandler({ build: require("./build") })
    : (request, reply, next) => {
        purgeRequireCache();
        let build = require("./build");
        return createRequestHandler({ build, mode: MODE })(
          request,
          reply,
          next
        );
      }
);

let port = process.env.PORT || 3000;

async function start() {
  try {
    await app.listen(port, () => {
      console.log(`Fastify server listening on port ${port}`);
    });
  } catch (error) {
    app.log.error(error);
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
