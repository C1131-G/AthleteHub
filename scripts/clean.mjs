import { rm } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");

/**
 * Build outputs that must not survive between packaging runs. Stale
 * `.next/standalone` trees are the usual cause of an installer shipping a
 * renderer that no longer matches the main process.
 */
const buildArtifacts = [
  ".next",
  "release",
  "tsconfig.tsbuildinfo",
  ".tmp-backend-build",
  "electron/generated",
];

/** Additionally removed by `clean:all` — restoring these needs a reinstall. */
const installedArtifacts = [
  "node_modules",
  "test-results",
  "playwright-report",
];

const targets = process.argv.includes("--all")
  ? [...buildArtifacts, ...installedArtifacts]
  : buildArtifacts;

// The targets are independent trees, so they come down together.
await Promise.all(
  targets.map(async (target) => {
    await rm(path.join(projectRoot, target), { force: true, recursive: true });
    process.stdout.write(`removed ${target}\n`);
  })
);
