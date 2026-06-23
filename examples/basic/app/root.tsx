import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  type MiddlewareFunction,
} from "react-router"

import { requestInfoContext } from "#request-info"

import "./styles.css"

export const middleware: MiddlewareFunction[] = [
  async ({ context }, next) => {
    let requestInfo = context.get(requestInfoContext)
    context.set(requestInfoContext, {
      ...requestInfo,
      source: `${requestInfo.source} -> root middleware`,
    })

    return next()
  },
]

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-[#f4f2ec] font-sans text-[#18202f] antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}
