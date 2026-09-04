import type { Collections } from "../../electron/collections";
import { createCollectionService } from "../../lib/collection-service";
import type { CollectionService } from "../../lib/collection-service";
import { assessmentInputSchema, assessmentSchema } from "./assessment-types";
import type { Assessment } from "./assessment-types";

export type AssessmentService = CollectionService<Assessment>;

export const createAssessmentService = (
  collections: Collections
): AssessmentService => {
  const collection = collections.assessments;
  return createCollectionService({
    archive: collection.archive,
    duplicateFieldErrors: { form: "That assessment already exists." },
    get: collection.get,
    identify: (record) => record.id,
    inputSchema: assessmentInputSchema,
    list: collection.list,
    make: (input, identity) => ({ ...input, ...identity }),
    merge: (existing, input, updatedAt) => ({
      ...existing,
      ...input,
      updatedAt,
    }),
    notFoundMessage: "Assessment not found.",
    recordSchema: assessmentSchema,
    restore: collection.restore,
    save: (assessment) =>
      collection.save({
        athleteId: assessment.athleteId,
        date: assessment.assessedOn,
        id: assessment.id,
        snapshot: JSON.stringify(assessment),
        type: assessment.assessmentType,
        weeklyReportId: assessment.weeklyReportId ?? null,
      }),
  });
};
