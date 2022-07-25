/**
 * @type {import('@remix-run/dev').AppConfig}
 */
module.exports = {
  appDirectory: "app",
  assetsBuildDirectory: "public/build",
  publicPath: "/modules/",
  server: "./server.ts",
  devServerBroadcastDelay: 1000,
};
