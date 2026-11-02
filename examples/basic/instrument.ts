import * as process from "node:process"

type ErrorReporting =
  | { readonly state: "disabled" }
  | { readonly state: "enabled"; readonly dsn: string }

type EnabledReporting = Extract<ErrorReporting, { state: "enabled" }>

function decide(raw: string | undefined): ErrorReporting {
  let trimmed = raw?.trim() ?? ""

  if (trimmed === "") {
    return { state: "disabled" }
  }

  return { state: "enabled", dsn: trimmed }
}

async function install(reporting: EnabledReporting): Promise<void> {
  let Sentry = await import("@sentry/node")

  Sentry.init({ dsn: reporting.dsn, tracesSampleRate: 0 })
}

const reporting = decide(process.env.SENTRY_DSN)

if (reporting.state === "enabled") {
  await install(reporting)
}
