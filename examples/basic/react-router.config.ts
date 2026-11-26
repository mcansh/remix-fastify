import type { Config } from "@react-router/dev/config"

export default {
  ssr: true,
  splitRouteModules: "enforce",
  subResourceIntegrity: true,
} satisfies Config
