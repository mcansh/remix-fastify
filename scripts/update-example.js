import path from "node:path";
import PackageJson from "@npmcli/package-json";

let __dirname = path.dirname(new URL(import.meta.url).pathname);
let root = path.resolve(__dirname, "..");

let remixFastify = await PackageJson.load(
  path.resolve(root, "packages", "remix-fastify"),
);

let version = remixFastify.content.version;

let example = await PackageJson.load(path.resolve(root, "example"));

example.update({
  dependencies: {
    ...example.content.dependencies,
    "@mcansh/remix-fastify": version,
  },
});

await example.save();
