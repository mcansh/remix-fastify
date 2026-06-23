import type { Config } from "@react-router/dev/config"

export default {
  ssr: true,
  future: {},
  splitRouteModules: "enforce",
  subResourceIntegrity: true,
} satisfies Config
