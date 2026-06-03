import { fastifyDevServer } from "@mcansh/remix-fastify/vite";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// The host server (server.js) and the app share the `nameContext` token via
// `app/context.ts`. React Router's context tokens are matched by object
// identity, so the bundled server build must NOT inline its own copy of this
// module — otherwise the host server's `getLoadContext` and the app's loaders
// would hold two distinct tokens and never see each other's values. Keeping it
// external makes both sides resolve to the same module instance at runtime.
const contextModule = fileURLToPath(
  new URL("./app/context.ts", import.meta.url),
);

export default defineConfig({
  build: {
    minify: false,
  },
  environments: {
    ssr: {
      build: {
        rollupOptions: {
          external: [contextModule],
          // The server build lands in `build/server/`; rewrite the externalized
          // token import to a relative specifier (instead of this machine's
          // absolute path) so the build stays portable across machines/deploys.
          output: {
            paths: { [contextModule]: "../../app/context.ts" },
          },
        },
      },
    },
  },
  plugins: [
    reactRouter(),
    fastifyDevServer({ entry: "./server.js" }),
    tsconfigPaths(),
    tailwindcss(),
  ],
});
