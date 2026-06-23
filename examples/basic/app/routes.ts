import type { RouteConfig } from "@react-router/dev/routes"
import { index, layout, route } from "@react-router/dev/routes"

export default [
  layout("./layout.tsx", [
    index("./routes/home.tsx"),
    route("about", "./routes/about.tsx"),
  ]),
] satisfies RouteConfig
