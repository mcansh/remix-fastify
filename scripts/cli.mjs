import fs from "node:fs";
import path from "node:path";
import { execa } from "execa";

const args = process.argv.slice(2);

const [command, ...rest] = args;

async function cli() {
  let packages = fs
    .readdirSync(path.resolve("packages"))
    .map((p) => path.resolve("packages", p));

  switch (command) {
    case "dev":
      for (let pkg of packages) {
        await execa("npm", ["run", "dev", "--if-present"], {
          cwd: pkg,
          stdio: "inherit",
        });
      }
      break;
    case "build":
      for (let pkg of packages) {
        await execa("npm", ["run", "build", "--if-present"], {
          cwd: pkg,
          stdio: "inherit",
        });
      }
      break;
    case "test":
      for (let pkg of packages) {
        await execa("npm", ["run", "test", "--if-present"], {
          cwd: pkg,
          stdio: "inherit",
        });
      }
      break;
    default:
      console.log(`Unknown command: ${command}`);
      break;
  }
}

cli().catch((err) => {
  console.error(err);
  process.exit(1);
});
