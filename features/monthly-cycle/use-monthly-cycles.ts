"use client";

import type { ListOptions } from "@/electron/collections";
import { collectionSchemas } from "@/features/backend/collection-services";
import { useCollection } from "@/lib/use-collection";

export const useMonthlyCycles = (options?: ListOptions) => {
  const { create, ready, records, ...rest } = useCollection(
    "monthlyCycles",
    collectionSchemas.monthlyCycles,
    options
  );
  return {
    archiveCycle: rest.archive,
    createCycle: create,
    cycles: records,
    ready,
    restoreCycle: rest.restore,
    updateCycle: rest.update,
  };
};
