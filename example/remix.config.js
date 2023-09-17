/**
 * @type {import('@remix-run/dev').AppConfig}
 */
module.exports = {
  ignoredRouteFiles: ["**/.*"],
  appDirectory: "app",
  assetsBuildDirectory: "public/build",
  serverBuildPath: "build/index.mjs",
  serverModuleFormat: "esm",
  future: {},
  // just confirming that a custom publicPath works
  publicPath: "/modules/",
};
