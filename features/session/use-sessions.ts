"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import "../../types/electron";
import type { ArcherySession, SessionMutationResult } from "./session-types";
import { sessionResponseSchema } from "./session-types";

const mutationResponseSchema = z.union([
  z.object({ session: sessionResponseSchema, status: z.literal("saved") }),
  z.object({
    fieldErrors: z.record(z.string(), z.string()),
    status: z.literal("invalid"),
  }),
]);
const listResponseSchema = z.array(sessionResponseSchema);

/** One definition, so the query and its invalidation cannot drift apart. */
const sessionKeys = {
  byAthlete: (athleteId: string) => ["sessions", "athlete", athleteId] as const,
};

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
    queryKey: sessionKeys.byAthlete(athleteId),
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
      const backend = api();
      if (!backend) {
        throw new Error("Open the AthleteHub desktop app to save sessions.");
      }
      const result = await (complete
        ? backend.complete(input)
        : backend.saveDraft(input));
      return mutationResponseSchema.parse(result);
    },
    onSuccess: async (result) => {
      if (result.status === "saved") {
        await queryClient.invalidateQueries({
          queryKey: sessionKeys.byAthlete(result.session.athleteId),
        });
      }
    },
  });
  return { ...query, save };
};
