"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findWorkspaceDir = findWorkspaceDir;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const error_1 = require("@pnpm/error");
const find_up_1 = __importDefault(require("find-up"));
const WORKSPACE_DIR_ENV_VAR = 'NPM_CONFIG_WORKSPACE_DIR';
const WORKSPACE_MANIFEST_FILENAME = 'pnpm-workspace.yaml';
const INVALID_WORKSPACE_MANIFEST_FILENAME = ['pnpm-workspaces.yaml', 'pnpm-workspaces.yml', 'pnpm-workspace.yml'];
async function findWorkspaceDir(cwd) {
    const workspaceManifestDirEnvVar = process.env[WORKSPACE_DIR_ENV_VAR] ?? process.env[WORKSPACE_DIR_ENV_VAR.toLowerCase()];
    const workspaceManifestLocation = workspaceManifestDirEnvVar
        ? path_1.default.join(workspaceManifestDirEnvVar, WORKSPACE_MANIFEST_FILENAME)
        : await (0, find_up_1.default)([WORKSPACE_MANIFEST_FILENAME, ...INVALID_WORKSPACE_MANIFEST_FILENAME], { cwd: await getRealPath(cwd) });
    if (workspaceManifestLocation && path_1.default.basename(workspaceManifestLocation) !== WORKSPACE_MANIFEST_FILENAME) {
        throw new error_1.PnpmError('BAD_WORKSPACE_MANIFEST_NAME', `The workspace manifest file should be named "pnpm-workspace.yaml". File found: ${workspaceManifestLocation}`);
    }
    return workspaceManifestLocation && path_1.default.dirname(workspaceManifestLocation);
}
async function getRealPath(path) {
    return new Promise((resolve) => {
        // We need to resolve the real native path for case-insensitive file systems.
        // For example, we can access file as C:\Code\Project as well as c:\code\projects
        // Without this we can face a problem when try to install packages with -w flag,
        // when root dir is using c:\code\projects but packages were found by C:\Code\Project
        fs_1.default.realpath.native(path, function (err, resolvedPath) {
            resolve(err !== null ? path : resolvedPath);
        });
    });
}
//# sourceMappingURL=index.js.map