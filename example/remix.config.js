/**
 * @type {import('@remix-run/dev').AppConfig}
 */
module.exports = {
  appDirectory: "app",
  assetsBuildDirectory: "public/build",
  publicPath: "/build/",
  server: "./server.ts",
  devServerPort: 8002,
  devServerBroadcastDelay: 1000,
};
