"use client";

import type { ListOptions } from "@/electron/collections";
import { collectionSchemas } from "@/features/backend/collection-services";
import { useCollection } from "@/lib/use-collection";

export const useEquipment = (options?: ListOptions) => {
  const { create, ready, records, ...rest } = useCollection(
    "equipment",
    collectionSchemas.equipment,
    options
  );

  return {
    archiveSetup: rest.archive,
    createSetup: create,
    getSetup: (setupId: string) =>
      records.find((setup) => setup.id === setupId),
    listByAthlete: (athleteId: string) =>
      records.filter((setup) => setup.athleteId === athleteId),
    ready,
    restoreSetup: rest.restore,
    setups: records,
    updateSetup: rest.update,
  };
};
