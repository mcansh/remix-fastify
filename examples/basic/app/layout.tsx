import { Outlet } from "react-router"

export default function Layout() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f2ec] bg-[linear-gradient(135deg,rgba(23,119,108,0.18),transparent_42%),linear-gradient(315deg,rgba(191,72,48,0.14),transparent_38%)] px-5 py-12">
      <section className="w-full max-w-180 rounded-lg border border-[#18202f24] bg-white/80 p-7 shadow-[0_24px_70px_rgba(24,32,47,0.12)] sm:p-10 md:p-14">
        <Outlet />
      </section>
    </main>
  )
}
