import type { Collections } from "../../electron/collections";
import { createCollectionService } from "../../lib/collection-service";
import type { CollectionService } from "../../lib/collection-service";
import { duplicateResult } from "../../lib/service-result";
import {
  seasonTrainingPlanInputSchema,
  seasonTrainingPlanSchema,
} from "./training-plan-types";
import type { SeasonTrainingPlan } from "./training-plan-types";

export type TrainingPlanService = CollectionService<SeasonTrainingPlan>;

export const createTrainingPlanService = (
  collections: Collections
): TrainingPlanService => {
  const collection = collections.trainingPlans;
  return createCollectionService({
    archive: collection.archive,
    duplicateFieldErrors: { form: "That training plan already exists." },
    get: collection.get,
    /**
     * Two rules the schema cannot see: a plan name is unique per athlete, and
     * an athlete may hold only one active plan at a time.
     */
    guard: (plan, others) => {
      const sameAthlete = others.filter(
        (entry) => entry.athleteId === plan.athleteId
      );
      if (
        sameAthlete.some(
          (entry) => entry.name.toLowerCase() === plan.name.toLowerCase()
        )
      ) {
        return duplicateResult({
          name: "This athlete already has a plan with that name.",
        });
      }
      if (
        plan.status === "active" &&
        sameAthlete.some((entry) => entry.status === "active")
      ) {
        return duplicateResult({
          status:
            "This athlete already has an active plan. Complete it before starting another.",
        });
      }
    },
    identify: (record) => record.id,
    inputSchema: seasonTrainingPlanInputSchema,
    list: collection.list,
    make: (input, identity) => ({ ...input, ...identity }),
    merge: (existing, input, updatedAt) => ({
      ...existing,
      ...input,
      updatedAt,
    }),
    normalize: (input) => ({
      ...input,
      events: input.events.map((event) => ({
        ...event,
        // A TBD event must not keep a stale date from an earlier edit.
        endsOn: event.dateStatus === "tbd" ? undefined : event.endsOn,
        location: event.location.trim(),
        name: event.name.trim(),
        notes: event.notes.trim(),
        startsOn: event.dateStatus === "tbd" ? undefined : event.startsOn,
      })),
      name: input.name.trim(),
      strategyNotes: input.strategyNotes.trim(),
      weeks: input.weeks
        .map((week) => ({
          ...week,
          technicalFocus: week.technicalFocus.trim(),
        }))
        .toSorted((a, b) => a.weekStart.localeCompare(b.weekStart)),
    }),
    notFoundMessage: "Training plan not found.",
    recordSchema: seasonTrainingPlanSchema,
    restore: collection.restore,
    save: (plan) =>
      collection.save({
        athleteId: plan.athleteId,
        id: plan.id,
        seasonEnd: plan.endsOn,
        seasonStart: plan.startsOn,
        snapshot: JSON.stringify(plan),
        status: plan.status,
      }),
  });
};
