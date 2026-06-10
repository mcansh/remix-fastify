import { fastifyDevServer } from "@mcansh/remix-fastify/vite";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    reactRouter(),
    tsconfigPaths(),
    tailwindcss(),
    fastifyDevServer({
      serverEntry: "./server.ts",
      external: ["./app/context.ts"],
    }),
  ],
});
