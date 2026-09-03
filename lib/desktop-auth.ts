import { z } from "zod";

const loginResponseSchema = z.object({ authenticated: z.literal(true) });
const recoveryResponseSchema = loginResponseSchema.extend({
  recoveryCode: z.string(),
});

export const desktopAuth = () => {
  const electronApi = globalThis.window?.electronAPI;
  if (!electronApi) {
    return null;
  }

  const { auth } = electronApi.backend;
  return {
    login: async (input: { password: string; username: string }) =>
      loginResponseSchema.parse(await auth.login(input)),
    logout: () => auth.logout(),
    recover: async (input: {
      newPassword: string;
      recoveryCode: string;
      username: string;
    }) => recoveryResponseSchema.parse(await auth.recover(input)),
    setup: async (input: { password: string; username: string }) =>
      z.object({ recoveryCode: z.string() }).parse(await auth.setup(input)),
    status: async () =>
      z
        .object({ authenticated: z.boolean(), configured: z.boolean() })
        .parse(await auth.status()),
  };
};
