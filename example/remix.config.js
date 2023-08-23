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
  // just showing that you can customize this and it will work with the plugin
  publicPath: "/modules/",
};
