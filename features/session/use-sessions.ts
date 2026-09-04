"use client";

import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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
  byId: (sessionId: string) => ["sessions", "id", sessionId] as const,
};

const api = () => {
  const electronApi = globalThis.window?.electronAPI;
  if (!electronApi) {
    return;
  }
  return electronApi.backend.sessions;
};

const sessionQueryOptions = (athleteId: string) =>
  queryOptions({
    enabled: Boolean(api() && athleteId),
    queryFn: async (): Promise<ArcherySession[]> => {
      const backend = api();
      if (!backend) {
        throw new Error("Open the AthleteHub desktop app to load sessions.");
      }
      return listResponseSchema.parse(await backend.listByAthlete(athleteId));
    },
    queryKey: sessionKeys.byAthlete(athleteId),
    retry: false,
    staleTime: 30_000,
  });

const sessionDetailOptions = (sessionId: string) =>
  queryOptions({
    enabled: Boolean(api() && sessionId),
    queryFn: async () => {
      const backend = api();
      if (!backend) {
        throw new Error("Open the AthleteHub desktop app to load sessions.");
      }
      return sessionResponseSchema.parse(await backend.get(sessionId));
    },
    queryKey: sessionKeys.byId(sessionId),
    retry: false,
    staleTime: 30_000,
  });

export const useSessions = (athleteId: string) => {
  const queryClient = useQueryClient();
  const query = useQuery(sessionQueryOptions(athleteId));
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
        queryClient.setQueryData(
          sessionKeys.byId(result.session.id),
          result.session
        );
        await queryClient.invalidateQueries({
          queryKey: sessionKeys.byAthlete(result.session.athleteId),
        });
      }
    },
  });
  return {
    data: query.data,
    isError: query.isError,
    isPending: query.isPending,
    save,
  };
};

export const useSession = (sessionId: string) =>
  useQuery(sessionDetailOptions(sessionId));
