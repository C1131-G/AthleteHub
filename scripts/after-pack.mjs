import { cp } from "node:fs/promises";
import path from "node:path";

/**
 * electron-builder unconditionally strips `node_modules` from `extraResources`,
 * which would ship the standalone server without its dependencies. Copy the
 * bundled modules into the packaged resources once packing is done.
 */
export default async function afterPack(context) {
  const projectRoot = context.packager.info.projectDir;
  const resourcesDir = context.packager.getResourcesDir(context.appOutDir);

  await cp(
    path.join(projectRoot, ".next", "standalone", "node_modules"),
    path.join(resourcesDir, "standalone", "node_modules"),
    { recursive: true }
  );

  await cp(
    path.join(projectRoot, "node_modules", "@libsql"),
    path.join(resourcesDir, "backend", "node_modules", "@libsql"),
    { recursive: true }
  );
}
