import type { Collections } from "../../electron/collections";
import { createCollectionService } from "../../lib/collection-service";
import type { CollectionService } from "../../lib/collection-service";
import { duplicateResult } from "../../lib/service-result";
import {
  monthlyCycleInputSchema,
  monthlyCycleSchema,
} from "./monthly-cycle-types";
import type { MonthlyAthleteCycle } from "./monthly-cycle-types";

export type MonthlyCycleService = CollectionService<MonthlyAthleteCycle>;

export const createMonthlyCycleService = (
  collections: Collections
): MonthlyCycleService => {
  const collection = collections.monthlyCycles;
  return createCollectionService({
    archive: collection.archive,
    duplicateFieldErrors: {
      month: "This athlete already has a cycle for that month.",
    },
    get: collection.get,
    /**
     * The unique index matches athlete ids exactly; the workflow has always
     * treated them case-insensitively, so the rule is kept here too.
     */
    guard: (cycle, others) => {
      if (
        others.some(
          (entry) =>
            entry.athleteId.toLowerCase() === cycle.athleteId.toLowerCase() &&
            entry.month === cycle.month
        )
      ) {
        return duplicateResult({
          month: "This athlete already has a cycle for that month.",
        });
      }
    },
    identify: (record) => record.id,
    inputSchema: monthlyCycleInputSchema,
    list: collection.list,
    make: (input, identity) => ({ ...input, ...identity }),
    merge: (existing, input, updatedAt) => ({
      ...existing,
      ...input,
      updatedAt,
    }),
    notFoundMessage: "Cycle not found.",
    recordSchema: monthlyCycleSchema,
    restore: collection.restore,
    save: (cycle) =>
      collection.save({
        athleteId: cycle.athleteId,
        completedAt: cycle.completedAt ? new Date(cycle.completedAt) : null,
        id: cycle.id,
        month: cycle.month,
        snapshot: JSON.stringify(cycle),
      }),
  });
};
