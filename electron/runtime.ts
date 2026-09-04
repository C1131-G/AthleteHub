import {
  collectionMethods,
  collectionNames,
  createCollectionServices,
} from "../features/backend/collection-services";
import { createSessionService } from "../features/session/session-service";
import { createAuthService } from "./auth";
import { createDatabaseContext } from "./backend";

export const createRuntime = async (databaseUrl: string) => {
  const database = await createDatabaseContext({ databaseUrl });
  return {
    close: () => database.close(),
    collectionMethods,
    collectionNames,
    createAuthService: () => createAuthService(database),
    createCollectionServices: () =>
      createCollectionServices(database.collections),
    createSessionService: () => createSessionService(database.sessions),
    database,
  };
};
