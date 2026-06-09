import { reactRouter } from "@react-router/dev/vite";
import { fastifyDevServer } from "@mcansh/remix-fastify/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    reactRouter(),
    fastifyDevServer({ serverEntry: "./server.js" }),
    tsconfigPaths(),
    tailwindcss(),
  ],
});
