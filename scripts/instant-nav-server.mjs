import { spawn } from "node:child_process";

const port = process.env.PORT ?? "3100";

const run = (command, args, env = {}) =>
  spawn(command, args, {
    env: { ...process.env, ...env },
    stdio: "inherit",
    windowsHide: true,
  });

const build = run("bun", ["run", "build"], { EXPOSE_TESTING_API: "1" });

const buildExitCode = await new Promise((resolve) => {
  build.on("exit", (code) => resolve(code ?? 1));
});

if (buildExitCode !== 0) {
  process.exit(buildExitCode);
}

// `output: "standalone"` omits static assets, so the bundle serves 404s for
// every chunk until they are copied in. Without this the pages render but never
// hydrate, and client-rendered assertions fail for reasons unrelated to the app.
const prepare = run("bun", ["run", "standalone"]);

const prepareExitCode = await new Promise((resolve) => {
  prepare.on("exit", (code) => resolve(code ?? 1));
});

if (prepareExitCode !== 0) {
  process.exit(prepareExitCode);
}

const server = run("node", [".next/standalone/server.js"], {
  EXPOSE_TESTING_API: "1",
  PORT: port,
});

const shutdown = () => {
  server.kill();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("exit", shutdown);
