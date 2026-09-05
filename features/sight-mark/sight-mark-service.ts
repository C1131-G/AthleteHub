import type { Collections } from "../../electron/collections";
import { createCollectionService } from "../../lib/collection-service";
import type { CollectionService } from "../../lib/collection-service";
import { sightMarkInputSchema, sightMarkSchema } from "./sight-mark-types";
import type { SightMark } from "./sight-mark-types";

export type SightMarkService = CollectionService<SightMark>;

export const createSightMarkService = (
  collections: Collections
): SightMarkService => {
  const collection = collections.sightMarks;
  return createCollectionService({
    archive: collection.archive,
    duplicateFieldErrors: {
      distanceM: "A sight mark for this distance already exists.",
    },
    get: collection.get,
    identify: (record) => record.id,
    inputSchema: sightMarkInputSchema,
    list: collection.list,
    make: (input, identity) => ({ ...input, ...identity }),
    merge: (existing, input, updatedAt) => ({
      ...existing,
      ...input,
      updatedAt,
    }),
    normalize: (input) => ({
      ...input,
      arrow: input.arrow.trim(),
      bow: input.bow.trim(),
      mark: input.mark.trim(),
      note: input.note.trim(),
    }),
    notFoundMessage: "Sight mark not found.",
    recordSchema: sightMarkSchema,
    restore: collection.restore,
    save: (mark) =>
      collection.save({
        arrow: mark.arrow,
        athleteId: mark.athleteId,
        bow: mark.bow,
        distanceM: mark.distanceM,
        id: mark.id,
        mark: mark.mark,
        note: mark.note,
        snapshot: JSON.stringify(mark),
      }),
  });
};
