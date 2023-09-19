/**
 * @type {import('@remix-run/dev').AppConfig}
 */
export default {
  ignoredRouteFiles: ["**/.*"],
  appDirectory: "app",
  assetsBuildDirectory: "public/build",
  serverBuildPath: "build/index.js",
  serverModuleFormat: "esm",
  future: {},
  // just confirming that a custom publicPath works
  publicPath: "/modules/",
};
