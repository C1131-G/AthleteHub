"use client";

import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { z } from "zod";

import "../../types/electron";
import { sessionClient } from "@/lib/collection-client";

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

const api = () => sessionClient();

const sessionQueryOptions = (athleteId: string) =>
  queryOptions({
    enabled: Boolean(athleteId),
    queryFn: async (): Promise<ArcherySession[]> =>
      listResponseSchema.parse(await api().listByAthlete(athleteId)),
    queryKey: sessionKeys.byAthlete(athleteId),
    retry: false,
    staleTime: 30_000,
  });

const sessionDetailOptions = (sessionId: string) =>
  queryOptions({
    enabled: Boolean(sessionId),
    queryFn: async () =>
      sessionResponseSchema.parse(await api().get(sessionId)),
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
