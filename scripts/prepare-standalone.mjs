import { access, cp, mkdir } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const standaloneDir = path.join(projectRoot, ".next", "standalone");

const exists = async (target) => {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
};

/**
 * `output: "standalone"` deliberately omits the static assets and public files
 * so they can be served from a CDN. Electron serves them from the same process,
 * so copy them into the bundle after every build.
 */
const prepareStandalone = async () => {
  if (!(await exists(path.join(standaloneDir, "server.js")))) {
    throw new Error(
      "No standalone build found. Run `bun run build` before preparing it."
    );
  }

  await mkdir(path.join(standaloneDir, ".next"), { recursive: true });
  await cp(
    path.join(projectRoot, ".next", "static"),
    path.join(standaloneDir, ".next", "static"),
    { recursive: true }
  );

  if (await exists(path.join(projectRoot, "public"))) {
    await cp(
      path.join(projectRoot, "public"),
      path.join(standaloneDir, "public"),
      { recursive: true }
    );
  }
};

await prepareStandalone();
