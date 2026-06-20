import { fastifyReactRouterDev } from "@mcansh/remix-fastify/vite"
import { reactRouter } from "@react-router/dev/vite"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
    fastifyReactRouterDev({
      entry: "./server.ts",
      externalizeServerEntryImports: ["#request-info"],
    }),
  ],
})
