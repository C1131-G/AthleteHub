import type { Collections } from "../../electron/collections";
import { createCollectionService } from "../../lib/collection-service";
import type { CollectionService } from "../../lib/collection-service";
import { athleteInputSchema, athleteSchema } from "./athlete-types";
import type { Athlete } from "./athlete-types";

export type AthleteService = CollectionService<Athlete>;

export const createAthleteService = (
  collections: Collections
): AthleteService => {
  const { athletes } = collections;
  return createCollectionService({
    archive: athletes.archive,
    // `athleteId` is the coach-facing code (AH-001), not the row id.
    duplicateFieldErrors: {
      athleteId: "Another athlete already uses this ID.",
    },
    get: athletes.get,
    identify: (record) => record.id,
    inputSchema: athleteInputSchema,
    list: athletes.list,
    make: (input, identity) => ({ ...input, ...identity }),
    merge: (existing, input, updatedAt) => ({
      ...existing,
      ...input,
      updatedAt,
    }),
    notFoundMessage: "Athlete not found.",
    recordSchema: athleteSchema,
    restore: athletes.restore,
    save: (athlete) =>
      athletes.save({
        category: athlete.category,
        code: athlete.athleteId,
        dateOfBirth: athlete.dateOfBirth,
        fullName: athlete.fullName,
        id: athlete.id,
        snapshot: JSON.stringify(athlete),
        status: athlete.status,
      }),
  });
};
