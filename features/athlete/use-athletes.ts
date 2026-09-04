"use client";

import type { ListOptions } from "@/electron/collections";
import { collectionSchemas } from "@/features/backend/collection-services";
import { useCollection } from "@/lib/use-collection";

export const useAthletes = (options?: ListOptions) => {
  const { create, isError, ready, records, ...rest } = useCollection(
    "athletes",
    collectionSchemas.athletes,
    options
  );
  return {
    archiveAthlete: rest.archive,
    athletes: records,
    createAthlete: create,
    isError,
    ready,
    restoreAthlete: rest.restore,
    updateAthlete: rest.update,
  };
};
