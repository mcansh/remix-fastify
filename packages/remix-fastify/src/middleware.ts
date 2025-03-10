import type {
  AppLoadContext,
  UNSAFE_MiddlewareEnabled as MiddlewareEnabled,
  unstable_InitialContext,
} from "react-router";

import type { FastifyReply, FastifyRequest } from "fastify";

type MaybePromise<T> = T | Promise<T>;

/**
 * A function that returns the value to use as `context` in route `loader` and
 * `action` functions.
 *
 * You can think of this as an escape hatch that allows you to pass
 * environment/platform-specific values through to your loader/action, such as
 * values that are generated by Express middleware like `req.session`.
 */
export type GetLoadContextFunction = (
  req: FastifyRequest,
  res: FastifyReply,
) => MiddlewareEnabled extends true
  ? MaybePromise<unstable_InitialContext>
  : MaybePromise<AppLoadContext>;
