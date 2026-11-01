import { defineRailway, github, project, service } from "railway/iac"

export default defineRailway(() => {
  let example = service("remix-fastify", {
    source: github("mcansh/remix-fastify", { branch: "dev" }),
    build: {
      builder: "RAILPACK",
      buildCommand: "pnpm -w build",
      watchPatterns: [
        "/examples/basic/**",
        "/packages/react-router-fastify/**",
        "/package.json",
        "/pnpm-lock.yaml",
        "/pnpm-workspace.yaml",
        "/.railway/**",
      ],
    },
    start: "cd examples/basic && pnpm run start",
    healthcheck: "/",
    // Keep existing dashboard settings so apply does not turn them off.
    deploy: {
      sleepApplication: true,
    },
    cdn: { enabled: true },
  })

  return project("remix-fastify", {
    resources: [example],
  })
})
