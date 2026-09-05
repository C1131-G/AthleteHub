import type { Collections } from "../../electron/collections";
import { createCollectionService } from "../../lib/collection-service";
import type { CollectionService } from "../../lib/collection-service";
import { wellnessInputSchema, wellnessSchema } from "./wellness-types";
import type { Wellness } from "./wellness-types";

export type WellnessService = CollectionService<Wellness>;

export const createWellnessService = (
  collections: Collections
): WellnessService => {
  const collection = collections.wellness;
  return createCollectionService({
    archive: collection.archive,
    duplicateFieldErrors: {
      date: "A wellness entry for this date already exists.",
    },
    get: collection.get,
    identify: (record) => record.id,
    inputSchema: wellnessInputSchema,
    list: collection.list,
    make: (input, identity) => ({ ...input, ...identity }),
    merge: (existing, input, updatedAt) => ({
      ...existing,
      ...input,
      updatedAt,
    }),
    normalize: (input) => ({
      ...input,
      note: input.note.trim(),
    }),
    notFoundMessage: "Wellness entry not found.",
    recordSchema: wellnessSchema,
    restore: collection.restore,
    save: (entry) =>
      collection.save({
        athleteId: entry.athleteId,
        date: entry.date,
        fatigue: entry.fatigue,
        id: entry.id,
        mood: entry.mood,
        note: entry.note,
        sleep: entry.sleep,
        snapshot: JSON.stringify(entry),
        soreness: entry.soreness,
        stress: entry.stress,
      }),
  });
};
