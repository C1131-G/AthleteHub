import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const outputDirectory = path.join(projectRoot, ".next");
const bunCommand = process.platform === "win32" ? "bun.exe" : "bun";

await mkdir(outputDirectory, { recursive: true });
const child = spawn(
  bunCommand,
  [
    "build",
    "electron/runtime.ts",
    "--outfile",
    path.join(outputDirectory, "electron-backend.mjs"),
    "--target=node",
    "--format=esm",
  ],
  { cwd: projectRoot, stdio: "inherit", windowsHide: true }
);

const code = await new Promise((resolve) => {
  child.once("exit", (exitCode) => {
    resolve(exitCode);
  });
});
if (code !== 0) {
  process.exitCode = code ?? 1;
}
