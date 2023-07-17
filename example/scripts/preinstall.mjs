import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

if (!process.env.DRY_RUN) {
  let __filename = new URL(import.meta.url).pathname;
  let __dirname = path.dirname(__filename);

  let example = path.join(__dirname, "..");
  let pkgJsonPath = path.join(example, "package.json");

  let pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath));

  let npm = execSync(`npm info @mcansh/remix-fastify --json`).toString();
  let json = JSON.parse(npm);
  let latest = json["dist-tags"].latest;

  pkgJson.dependencies["@mcansh/remix-fastify"] = latest;
  delete pkgJson.scripts.preinstall;

  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2), "utf-8");
}
