"use client";

import type { ListOptions } from "@/electron/collections";
import { collectionSchemas } from "@/features/backend/collection-services";
import { useCollection } from "@/lib/use-collection";

export const useWellness = (options?: ListOptions) => {
  const { create, ready, records, ...rest } = useCollection(
    "wellness",
    collectionSchemas.wellness,
    options
  );

  return {
    archiveEntry: rest.archive,
    createEntry: create,
    entries: records,
    getEntry: (entryId: string) =>
      records.find((entry) => entry.id === entryId),
    listByAthlete: (athleteId: string) =>
      records.filter((entry) => entry.athleteId === athleteId),
    ready,
    restoreEntry: rest.restore,
    updateEntry: rest.update,
  };
};
