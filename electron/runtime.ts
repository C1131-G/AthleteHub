import { createSessionService } from "../features/session/session-service";
import { createAuthService } from "./auth";
import { createDatabaseContext } from "./backend";

export const createRuntime = async (databaseUrl: string) => {
  const database = await createDatabaseContext({ databaseUrl });
  return {
    close: () => database.close(),
    createAuthService: () => createAuthService(database),
    createSessionService: () => createSessionService(database),
    database,
  };
};
