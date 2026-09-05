"use client";

import type { ListOptions } from "@/electron/collections";
import { collectionSchemas } from "@/features/backend/collection-services";
import { useCollection } from "@/lib/use-collection";

import { interpolateMark } from "./interpolate";

export const useSightMarks = (options?: ListOptions) => {
  const { create, ready, records, ...rest } = useCollection(
    "sightMarks",
    collectionSchemas.sightMarks,
    options
  );

  return {
    archiveMark: rest.archive,
    createMark: create,
    getMark: (markId: string) => records.find((mark) => mark.id === markId),
    listByAthlete: (athleteId: string) =>
      records.filter((mark) => mark.athleteId === athleteId),
    /**
     * The sight setting to try for a distance that has no recorded mark:
     * interpolated between the two brackets, or the nearest mark outside it.
     */
    markFor: (bow: string, arrow: string, distanceM: number) =>
      interpolateMark(records, bow, arrow, distanceM),
    marks: records,
    ready,
    restoreMark: rest.restore,
    updateMark: rest.update,
  };
};
