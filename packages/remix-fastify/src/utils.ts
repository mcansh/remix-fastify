import type { EarlyHintItem } from "@fastify/early-hints";
import type { ServerBuild } from "@remix-run/node";
import { matchRoutes } from "@remix-run/router";
import type { FastifyRequest } from "fastify";

export function getEarlyHintLinks(
  request: FastifyRequest,
  serverBuild: ServerBuild,
): EarlyHintItem[] {
  let origin = `${request.protocol}://${request.hostname}`;
  let url = new URL(`${origin}${request.url}`);

  let routes = Object.values(serverBuild.assets.routes);
  let matches = matchRoutes(routes, url.pathname);
  if (!matches || matches.length === 0) return [];
  let links = matches.flatMap((match) => {
    let routeImports = match.route.imports || [];
    let imports = [
      match.route.module,
      ...routeImports,
      serverBuild.assets.url,
      serverBuild.assets.entry.module,
      ...serverBuild.assets.entry.imports,
    ];

    return imports;
  });

  return links.map((link) => {
    return { href: link, as: "script", rel: "preload" };
  });
}
