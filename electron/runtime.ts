import path from "node:path";

import {
  collectionMethods,
  collectionNames,
  createCollectionServices,
} from "../features/backend/collection-services";
import { createSessionService } from "../features/session/session-service";
import { createAuthService } from "./auth";
import { createDatabaseContext } from "./backend";
import { createPhotoStore } from "./photos";
import { readPreferencesFile, writePreferencesFile } from "./preferences";
import type { AppPreferences } from "./preferences";

export interface RuntimeOptions {
  photosPath?: string;
  preferencesPath?: string;
}

export const createRuntime = async (
  databaseUrl: string,
  { photosPath, preferencesPath }: RuntimeOptions = {}
) => {
  const database = await createDatabaseContext({ databaseUrl });
  const photos = createPhotoStore(
    photosPath ?? path.join(process.cwd(), "photos-unused")
  );
  return {
    close: () => database.close(),
    collectionMethods,
    collectionNames,
    createAuthService: () => createAuthService(database),
    createCollectionServices: () =>
      createCollectionServices(database.collections),
    createSessionService: () => createSessionService(database.sessions),
    database,
    readPhoto: (name: unknown) => photos.read(name),
    readPreferences: () =>
      preferencesPath
        ? readPreferencesFile(preferencesPath)
        : readPreferencesFile("__defaults__"),
    savePhoto: (input: unknown) => photos.save(input),
    writePreferences: (partial: Partial<AppPreferences>) => {
      if (!preferencesPath) {
        return { ...readPreferencesFile("__defaults__"), ...partial };
      }
      return writePreferencesFile(preferencesPath, partial);
    },
  };
};
