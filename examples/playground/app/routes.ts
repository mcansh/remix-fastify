import {
  index,
  layout,
  route,
  type RouteConfig,
} from "@react-router/dev/routes";

export default [
  layout("routes/_layout.tsx", [
    index("routes/_layout._index.tsx"),
    route("fetcher", "routes/_layout.fetcher.tsx"),
    route("loader-error", "routes/_layout.loader-error.tsx"),
    route("page-2", "routes/_layout.page-2.tsx"),
    route("resource-route-error", "routes/_layout.resource-route-error.tsx"),
    route("route-error", "routes/_layout.route-error.tsx"),
  ]),
] satisfies RouteConfig;
