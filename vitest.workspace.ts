import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "./packages/remix-fastify/vitest.config.ts",
  "./examples/vite/vite.config.ts",
  "./examples/react-router/vite.config.ts",
  "./examples/playground/vite.config.ts",
]);
