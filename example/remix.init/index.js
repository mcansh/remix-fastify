const { execSync } = require("node:child_process");

module.exports = async ({ packageManager, rootDirectory }) => {
  let install = packageManager === "yarn" ? "add" : "install";
  console.log(
    `installing @mcansh/remix-fastify from npm using ${packageManager}`
  );

  execSync(`${packageManager} ${install} @mcansh/remix-fastify`, {
    cwd: rootDirectory,
    stdio: "inherit",
  });

  console.log(`✅ ready to roll!`);
};
