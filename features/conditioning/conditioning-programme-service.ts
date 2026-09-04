import type { Collections } from "../../electron/collections";
import { createCollectionService } from "../../lib/collection-service";
import type { CollectionService } from "../../lib/collection-service";
import { duplicateResult } from "../../lib/service-result";
import { overlappingActiveProgramme } from "./conditioning-calculations";
import {
  conditioningProgrammeInputSchema,
  conditioningProgrammeSchema,
} from "./conditioning-types";
import type { ConditioningProgramme } from "./conditioning-types";

export type ConditioningProgrammeService =
  CollectionService<ConditioningProgramme>;

export const createConditioningProgrammeService = (
  collections: Collections
): ConditioningProgrammeService => {
  const collection = collections.conditioningProgrammes;
  return createCollectionService({
    archive: collection.archive,
    duplicateFieldErrors: {
      form: "That conditioning programme already exists.",
    },
    get: collection.get,
    /** Two active programmes for one athlete must not cover the same dates. */
    guard: (programme, others) => {
      if (
        programme.status === "active" &&
        overlappingActiveProgramme(
          others,
          programme.athleteId,
          programme.startsOn,
          programme.endsOn
        )
      ) {
        return duplicateResult({
          startsOn:
            "An active programme already covers part of this date range.",
        });
      }
    },
    identify: (record) => record.id,
    inputSchema: conditioningProgrammeInputSchema,
    list: collection.list,
    make: (input, identity) => ({ ...input, ...identity }),
    merge: (existing, input, updatedAt) => ({
      ...existing,
      ...input,
      updatedAt,
    }),
    normalize: (input) => ({
      ...input,
      customPhase: input.customPhase?.trim() || undefined,
      objectives: input.objectives.flatMap((line) =>
        line.trim() ? [line.trim()] : []
      ),
      restrictionNotes: input.restrictionNotes.trim(),
      title: input.title.trim(),
    }),
    notFoundMessage: "Conditioning programme not found.",
    recordSchema: conditioningProgrammeSchema,
    restore: collection.restore,
    save: (programme) =>
      collection.save({
        athleteId: programme.athleteId,
        endDate: programme.endsOn,
        id: programme.id,
        snapshot: JSON.stringify(programme),
        startDate: programme.startsOn,
        status: programme.status,
      }),
  });
};
