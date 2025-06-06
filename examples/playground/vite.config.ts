import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ isSsrBuild }) => {
  return {
    build: {
      minify: false,
      rollupOptions: isSsrBuild ? { input: "./server.ts" } : undefined,
    },
    plugins: [reactRouter(), tsconfigPaths(), tailwindcss()],
  };
});
