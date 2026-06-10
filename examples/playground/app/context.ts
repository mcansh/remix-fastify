import { createContext } from "react-router";

/**
 * A demo value injected by the Fastify server through `reactRouterFastify`'s
 * `getLoadContext`, then read in route loaders via `context.get(nameContext)`.
 * Shared between `server.js` and the app so both reference the same token.
 */
export const nameContext = createContext<string>();


