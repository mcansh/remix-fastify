import { Link } from "react-router"

export function meta() {
  return [{ title: "About | React Router Fastify Example" }]
}

export default function About() {
  return (
    <>
      <p className="mb-3.5 text-xs font-bold text-[#17776c] uppercase">
        Nested framework route
      </p>
      <h1 className="m-0 max-w-[12ch] text-[2.2rem] leading-[0.95] font-bold tracking-normal text-[#18202f] sm:text-5xl md:text-[4.2rem]">
        The Vite plugin mounted this Fastify app during dev.
      </h1>
      <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-[#4f5a69]">
        The example uses the regular{" "}
        <code className="rounded bg-[#18202f14] px-1 py-0.5">
          react-router dev
        </code>{" "}
        command. Vite handles its own middleware first, then passes application
        requests to Fastify.
      </p>
      <div className="mt-8 flex flex-wrap gap-3 [&>a]:inline-flex [&>a]:min-h-11 [&>a]:items-center [&>a]:rounded-md [&>a]:border [&>a]:border-[#18202f2e] [&>a]:px-4 [&>a]:font-bold [&>a]:text-inherit [&>a]:no-underline [&>a:first-child]:bg-[#18202f] [&>a:first-child]:text-white [&>a:not(:first-child)]:bg-white [&>a:not(:first-child)]:text-[#18202f]">
        <Link to="/">Home</Link>
        <a href="/api/health">Fastify API</a>
      </div>
    </>
  )
}
