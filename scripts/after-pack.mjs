import { access, cp } from "node:fs/promises";
import path from "node:path";

const exists = async (target) => {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
};

/**
 * electron-builder unconditionally strips `node_modules` from `extraResources`,
 * which would ship the standalone server without its dependencies. Copy the
 * bundled modules into the packaged resources once packing is done.
 */
export default async function afterPack(context) {
  const projectRoot = context.packager.info.projectDir;
  const resourcesDir = context.packager.getResourcesDir(context.appOutDir);

  const standaloneModules = path.join(
    projectRoot,
    ".next",
    "standalone",
    "node_modules"
  );
  if (!(await exists(standaloneModules))) {
    throw new Error(
      "Missing .next/standalone/node_modules — run `bun run dist:prepare` before packaging."
    );
  }
  await cp(
    standaloneModules,
    path.join(resourcesDir, "standalone", "node_modules"),
    { recursive: true }
  );

  /**
   * `@libsql` ships prebuilt, platform-specific bindings. Copying the host's
   * copy is why each installer must be packaged on its own OS and architecture.
   */
  const libsql = path.join(projectRoot, "node_modules", "@libsql");
  if (!(await exists(libsql))) {
    throw new Error(
      "Missing node_modules/@libsql — install dependencies on this platform before packaging."
    );
  }
  await cp(
    libsql,
    path.join(resourcesDir, "backend", "node_modules", "@libsql"),
    { recursive: true }
  );
}
