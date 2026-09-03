"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import "../../types/electron";
import { sessionInputSchema } from "./session-types";
import type { ArcherySession, SessionMutationResult } from "./session-types";

const sessionResponseSchema = sessionInputSchema.extend({
  createdAt: z.string(),
  status: z.enum(["draft", "complete"]),
  updatedAt: z.string(),
});
const mutationResponseSchema = z.union([
  z.object({ session: sessionResponseSchema, status: z.literal("saved") }),
  z.object({
    fieldErrors: z.record(z.string(), z.string()),
    status: z.literal("invalid"),
  }),
]);
const listResponseSchema = z.array(sessionResponseSchema);

const api = () => {
  const electronApi = globalThis.window?.electronAPI;
  if (!electronApi) {
    return;
  }
  return electronApi.backend.sessions;
};

export const useSessions = (athleteId: string) => {
  const queryClient = useQueryClient();
  const query = useQuery({
    enabled: Boolean(api() && athleteId),
    queryFn: async (): Promise<ArcherySession[]> =>
      listResponseSchema.parse(await api()?.listByAthlete(athleteId)),
    queryKey: ["sessions", "athlete", athleteId],
    staleTime: 30_000,
  });
  const save = useMutation({
    mutationFn: async ({
      input,
      complete,
    }: {
      complete: boolean;
      input: unknown;
    }): Promise<SessionMutationResult> => {
      const result = await (complete
        ? api()?.complete(input)
        : api()?.saveDraft(input));
      return mutationResponseSchema.parse(result);
    },
    onSuccess: async (result) => {
      if (result.status === "saved") {
        await queryClient.invalidateQueries({
          queryKey: ["sessions", "athlete", result.session.athleteId],
        });
      }
    },
  });
  return { ...query, save };
};
