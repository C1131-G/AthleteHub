"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import type { ListOptions } from "../electron/collections";
import type {
  CollectionName,
  CollectionRecordMap,
} from "../features/backend/collection-services";
import { collectionClient } from "./collection-client";
import type { CollectionMutationResult } from "./collection-service";
import { storageErrorResult } from "./service-result";

/** One definition, so a query and its invalidation cannot drift apart. */
export const collectionKeys = {
  all: (name: CollectionName) => [name] as const,
  list: (name: CollectionName, options?: ListOptions) =>
    [name, "list", options ?? {}] as const,
};

export interface CollectionHook<TRecord> {
  archive: (id: string) => Promise<CollectionMutationResult<TRecord>>;
  create: (input: unknown) => Promise<CollectionMutationResult<TRecord>>;
  isError: boolean;
  ready: boolean;
  records: TRecord[];
  restore: (id: string) => Promise<CollectionMutationResult<TRecord>>;
  update: (
    id: string,
    input: unknown
  ) => Promise<CollectionMutationResult<TRecord>>;
}

/**
 * Reads a whole collection and exposes its mutations. The list is deliberately
 * unscoped by default: the screens filter in memory the way they did when every
 * record came from one localStorage array, so this swap does not change how
 * they derive their data.
 */
export const useCollection = <TName extends CollectionName>(
  name: TName,
  schema: z.ZodType<CollectionRecordMap[TName]>,
  options?: ListOptions
): CollectionHook<CollectionRecordMap[TName]> => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryFn: async () => {
      const records = await collectionClient(name).list(options);
      // The records crossed a process boundary; parse before they are cached.
      return z.array(schema).parse(records);
    },
    queryKey: collectionKeys.list(name, options),
    staleTime: 30_000,
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: collectionKeys.all(name) });
  };

  const mutation = useMutation({
    mutationFn: async (
      run: () => Promise<CollectionMutationResult<CollectionRecordMap[TName]>>
    ) => await run(),
    onSuccess: async (result) => {
      if (result.status === "saved") {
        await invalidate();
      }
    },
  });

  /**
   * A rejected write becomes a result the forms already know how to render.
   * Validation and duplicates come back as results; only a broken database or
   * IPC channel throws, and that must not surface as an unhandled rejection in
   * an event handler.
   */
  const run = async (
    operation: () => Promise<
      CollectionMutationResult<CollectionRecordMap[TName]>
    >
  ): Promise<CollectionMutationResult<CollectionRecordMap[TName]>> => {
    try {
      return await mutation.mutateAsync(operation);
    } catch {
      return storageErrorResult(
        "That change could not be saved. Try again, and check the app has access to its data."
      );
    }
  };

  return {
    archive: (id) => run(() => collectionClient(name).archive(id)),
    create: (input) => run(() => collectionClient(name).create(input)),
    isError: query.isError,
    ready: query.isSuccess,
    records: query.data ?? [],
    restore: (id) => run(() => collectionClient(name).restore(id)),
    update: (id, input) => run(() => collectionClient(name).update(id, input)),
  };
};
