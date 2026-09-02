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
