import type { Collections } from "../../electron/collections";
import { createCollectionService } from "../../lib/collection-service";
import type { CollectionService } from "../../lib/collection-service";
import { duplicateResult } from "../../lib/service-result";
import {
  conditioningAssessmentInputSchema,
  conditioningAssessmentSchema,
} from "./conditioning-types";
import type { ConditioningAssessment } from "./conditioning-types";

export type ConditioningAssessmentService =
  CollectionService<ConditioningAssessment>;

export const createConditioningAssessmentService = (
  collections: Collections
): ConditioningAssessmentService => {
  const collection = collections.conditioningAssessments;
  return createCollectionService({
    archive: collection.archive,
    duplicateFieldErrors: {
      form: "That conditioning assessment already exists.",
    },
    get: collection.get,
    /** One conditioning assessment per athlete per date. */
    guard: (assessment, others) => {
      if (
        others.some(
          (entry) =>
            entry.athleteId === assessment.athleteId &&
            entry.assessedOn === assessment.assessedOn
        )
      ) {
        return duplicateResult({
          assessedOn:
            "An assessment already exists for this athlete on this date.",
        });
      }
    },
    identify: (record) => record.id,
    inputSchema: conditioningAssessmentInputSchema,
    list: collection.list,
    make: (input, identity) => ({ ...input, ...identity }),
    merge: (existing, input, updatedAt) => ({
      ...existing,
      ...input,
      updatedAt,
    }),
    normalize: (input) => ({
      ...input,
      coachSummary: input.coachSummary.trim(),
      developmentAreas: input.developmentAreas.flatMap((line) =>
        line.trim() ? [line.trim()] : []
      ),
      recommendations: input.recommendations.flatMap((line) =>
        line.trim() ? [line.trim()] : []
      ),
      restrictionNotes: input.restrictionNotes.trim(),
      strengths: input.strengths.flatMap((line) =>
        line.trim() ? [line.trim()] : []
      ),
    }),
    notFoundMessage: "Conditioning assessment not found.",
    recordSchema: conditioningAssessmentSchema,
    restore: collection.restore,
    save: (assessment) =>
      collection.save({
        athleteId: assessment.athleteId,
        date: assessment.assessedOn,
        id: assessment.id,
        snapshot: JSON.stringify(assessment),
      }),
  });
};
