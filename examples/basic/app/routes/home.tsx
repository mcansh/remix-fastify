import { Link } from "react-router"

import { requestInfoContext } from "#request-info"

import type { Route } from "./+types/home"

export function meta() {
  return [
    { title: "React Router Fastify Example" },
    {
      name: "description",
      content: "Example app for @mcansh/remix-fastify",
    },
  ]
}

export async function loader({ context, url }: Route.LoaderArgs) {
  return {
    requestInfo: context.get(requestInfoContext),
    pathname: url.pathname,
  }
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <p className="mb-3.5 text-xs font-bold text-[#17776c] uppercase">
        Fastify adapter example
      </p>
      <h1 className="m-0 max-w-[12ch] text-[2.2rem] leading-[0.95] font-bold tracking-normal text-[#18202f] sm:text-5xl md:text-[4.2rem]">
        React Router is running through Fastify.
      </h1>
      <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-[#4f5a69]">
        This page was rendered by React Router, while the custom server keeps
        normal Fastify routes available beside the framework catch-all.
      </p>

      <dl className="mt-8 grid gap-3">
        <div className="grid gap-1.5 border-t border-[#18202f1f] py-3.5 sm:grid-cols-[minmax(96px,0.35fr)_1fr] sm:gap-4">
          <dt className="text-sm font-bold text-[#6c7280]">Route</dt>
          <dd className="m-0 min-w-0 font-mono wrap-anywhere">
            {loaderData.pathname}
          </dd>
        </div>
        <div className="grid gap-1.5 border-t border-[#18202f1f] py-3.5 sm:grid-cols-[minmax(96px,0.35fr)_1fr] sm:gap-4">
          <dt className="text-sm font-bold text-[#6c7280]">Request id</dt>
          <dd className="m-0 min-w-0 font-mono wrap-anywhere">
            {loaderData.requestInfo.requestId}
          </dd>
        </div>
        <div className="grid gap-1.5 border-t border-[#18202f1f] py-3.5 sm:grid-cols-[minmax(96px,0.35fr)_1fr] sm:gap-4">
          <dt className="text-sm font-bold text-[#6c7280]">User agent</dt>
          <dd className="m-0 min-w-0 font-mono wrap-anywhere">
            {loaderData.requestInfo.userAgent}
          </dd>
        </div>
        <div className="grid gap-1.5 border-t border-[#18202f1f] py-3.5 sm:grid-cols-[minmax(96px,0.35fr)_1fr] sm:gap-4">
          <dt className="text-sm font-bold text-[#6c7280]">Context source</dt>
          <dd className="m-0 min-w-0 font-mono wrap-anywhere">
            {loaderData.requestInfo.source}
          </dd>
        </div>
      </dl>

      <div className="mt-8 flex flex-wrap gap-3 [&>a]:inline-flex [&>a]:min-h-11 [&>a]:items-center [&>a]:rounded-md [&>a]:border [&>a]:border-[#18202f2e] [&>a]:px-4 [&>a]:font-bold [&>a]:text-inherit [&>a]:no-underline [&>a:first-child]:bg-[#18202f] [&>a:first-child]:text-white [&>a:not(:first-child)]:bg-white [&>a:not(:first-child)]:text-[#18202f]">
        <a href="/api/health">Open Fastify API</a>
        <Link to="/about">About route</Link>
      </div>
    </>
  )
}
