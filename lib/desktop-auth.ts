import { z } from "zod";

const logoutResponseSchema = z.void();

/**
 * The local login screen owns the account surface; the app itself only ever
 * ends a session.
 */
export const desktopAuth = () => {
  const electronApi = globalThis.window?.electronAPI;
  if (!electronApi) {
    return null;
  }

  return {
    logout: async () => {
      logoutResponseSchema.parse(await electronApi.backend.auth.logout());
    },
  };
};
