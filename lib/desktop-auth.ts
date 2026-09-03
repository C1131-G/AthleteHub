import { z } from "zod";

const loginResponseSchema = z.object({ authenticated: z.literal(true) });

export const desktopAuth = () => {
  const electronApi = globalThis.window?.electronAPI;
  if (!electronApi) {
    return null;
  }

  const { auth } = electronApi.backend;
  return {
    login: async (input: { email: string; password: string }) =>
      loginResponseSchema.parse(await auth.login(input)),
    logout: () => auth.logout(),
    recover: async (input: {
      email: string;
      newPassword: string;
      recoveryCode: string;
    }) => loginResponseSchema.parse(await auth.recover(input)),
    setup: async (input: { email: string; password: string }) =>
      z.object({ recoveryCode: z.string() }).parse(await auth.setup(input)),
    status: async () =>
      z
        .object({ authenticated: z.boolean(), configured: z.boolean() })
        .parse(await auth.status()),
  };
};
