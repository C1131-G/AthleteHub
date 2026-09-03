import "client-only";
import { readStoredArray, writeStored } from "@/lib/storage";

import { overlappingActiveProgramme } from "./conditioning-calculations";
import {
  conditioningAssessmentInputSchema,
  conditioningAssessmentSchema,
  conditioningProgrammeInputSchema,
  conditioningProgrammeSchema,
} from "./conditioning-types";
import type {
  ConditioningAssessment,
  ConditioningAssessmentInput,
  ConditioningProgramme,
  ConditioningProgrammeInput,
  ConditioningRepository,
} from "./conditioning-types";

const ASSESSMENTS_KEY = "athletehub.conditioning-assessments.v1";
const PROGRAMMES_KEY = "athletehub.conditioning-programmes.v1";

interface ParseSchema<T> {
  safeParse: (value: unknown) =>
    | { data: T; success: true }
    | {
        error: { flatten: () => { fieldErrors: Record<string, string[]> } };
        success: false;
      };
}

// Each record is parsed independently so one malformed record cannot remove
// an athlete's valid conditioning history.
const read = <T>(key: string, schema: ParseSchema<T>) =>
  readStoredArray(key).flatMap((value) => {
    const result = schema.safeParse(value);
    return result.success ? [result.data] : [];
  });

const write = (key: string, value: unknown[]) => writeStored(key, value);

const fieldErrorsOf = (error: {
  flatten: () => { fieldErrors: Record<string, string[]> };
}) => {
  const errors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(error.flatten().fieldErrors)) {
    const [message] = messages;
    if (message) {
      errors[field] = message;
    }
  }
  return errors;
};

const invalid = (fieldErrors: Record<string, string>) => ({
  fieldErrors,
  status: "invalid" as const,
});

const storageError = (message: string) => ({
  fieldErrors: { form: message },
  status: "storage-error" as const,
});

const failure = (
  status: "duplicate" | "not-found",
  fieldErrors: Record<string, string>
) => ({ fieldErrors, status });

const cleanAssessment = (input: ConditioningAssessmentInput) => ({
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
});

const cleanProgramme = (input: ConditioningProgrammeInput) => ({
  ...input,
  customPhase: input.customPhase?.trim() || undefined,
  objectives: input.objectives.flatMap((line) =>
    line.trim() ? [line.trim()] : []
  ),
  restrictionNotes: input.restrictionNotes.trim(),
  title: input.title.trim(),
});

const duplicateOnAthleteDate = (
  assessments: ConditioningAssessment[],
  input: ConditioningAssessmentInput,
  ignoreId?: string
) =>
  assessments.some(
    (assessment) =>
      assessment.id !== ignoreId &&
      assessment.athleteId === input.athleteId &&
      assessment.assessedOn === input.assessedOn
  );

export const conditioningRepository: ConditioningRepository = {
  createAssessment: (input) => {
    const parsed = conditioningAssessmentInputSchema.safeParse(
      cleanAssessment(input)
    );
    if (!parsed.success) {
      return invalid(fieldErrorsOf(parsed.error));
    }
    const assessments = read(ASSESSMENTS_KEY, conditioningAssessmentSchema);
    if (duplicateOnAthleteDate(assessments, parsed.data)) {
      return failure("duplicate", {
        assessedOn:
          "An assessment already exists for this athlete on this date.",
      });
    }
    const now = new Date().toISOString();
    const record = {
      ...parsed.data,
      createdAt: now,
      id: crypto.randomUUID(),
      updatedAt: now,
    } satisfies ConditioningAssessment;
    if (!write(ASSESSMENTS_KEY, [record, ...assessments])) {
      return storageError("Could not save the assessment on this device.");
    }
    return { record, status: "saved" };
  },
  createProgramme: (input) => {
    const parsed = conditioningProgrammeInputSchema.safeParse(
      cleanProgramme(input)
    );
    if (!parsed.success) {
      return invalid(fieldErrorsOf(parsed.error));
    }
    const programmes = read(PROGRAMMES_KEY, conditioningProgrammeSchema);
    if (
      parsed.data.status === "active" &&
      overlappingActiveProgramme(
        programmes,
        parsed.data.athleteId,
        parsed.data.startsOn,
        parsed.data.endsOn
      )
    ) {
      return failure("duplicate", {
        startsOn: "An active programme already covers part of this date range.",
      });
    }
    const now = new Date().toISOString();
    const record = {
      ...parsed.data,
      createdAt: now,
      id: crypto.randomUUID(),
      updatedAt: now,
    } satisfies ConditioningProgramme;
    if (!write(PROGRAMMES_KEY, [record, ...programmes])) {
      return storageError("Could not save the programme on this device.");
    }
    return { record, status: "saved" };
  },
  getAssessment: (id) =>
    read(ASSESSMENTS_KEY, conditioningAssessmentSchema).find(
      (assessment) => assessment.id === id
    ),
  getProgramme: (id) =>
    read(PROGRAMMES_KEY, conditioningProgrammeSchema).find(
      (programme) => programme.id === id
    ),
  listAssessments: () =>
    read(ASSESSMENTS_KEY, conditioningAssessmentSchema).toSorted((a, b) =>
      `${b.assessedOn}${b.createdAt}`.localeCompare(
        `${a.assessedOn}${a.createdAt}`
      )
    ),
  listProgrammes: () =>
    read(PROGRAMMES_KEY, conditioningProgrammeSchema).toSorted((a, b) =>
      `${b.startsOn}${b.createdAt}`.localeCompare(`${a.startsOn}${a.createdAt}`)
    ),
  updateAssessment: (id, input) => {
    const parsed = conditioningAssessmentInputSchema.safeParse(
      cleanAssessment(input)
    );
    if (!parsed.success) {
      return invalid(fieldErrorsOf(parsed.error));
    }
    const assessments = read(ASSESSMENTS_KEY, conditioningAssessmentSchema);
    const existing = assessments.find((assessment) => assessment.id === id);
    if (!existing) {
      return failure("not-found", { form: "Assessment not found." });
    }
    if (duplicateOnAthleteDate(assessments, parsed.data, id)) {
      return failure("duplicate", {
        assessedOn:
          "An assessment already exists for this athlete on this date.",
      });
    }
    const updated = {
      ...existing,
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    } satisfies ConditioningAssessment;
    if (
      !write(
        ASSESSMENTS_KEY,
        assessments.map((assessment) =>
          assessment.id === id ? updated : assessment
        )
      )
    ) {
      return storageError("Could not save the assessment on this device.");
    }
    return { record: updated, status: "saved" };
  },
  updateProgramme: (id, input) => {
    const parsed = conditioningProgrammeInputSchema.safeParse(
      cleanProgramme(input)
    );
    if (!parsed.success) {
      return invalid(fieldErrorsOf(parsed.error));
    }
    const programmes = read(PROGRAMMES_KEY, conditioningProgrammeSchema);
    const existing = programmes.find((programme) => programme.id === id);
    if (!existing) {
      return failure("not-found", { form: "Programme not found." });
    }
    if (
      parsed.data.status === "active" &&
      overlappingActiveProgramme(
        programmes,
        parsed.data.athleteId,
        parsed.data.startsOn,
        parsed.data.endsOn,
        id
      )
    ) {
      return failure("duplicate", {
        startsOn: "An active programme already covers part of this date range.",
      });
    }
    const updated = {
      ...existing,
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    } satisfies ConditioningProgramme;
    if (
      !write(
        PROGRAMMES_KEY,
        programmes.map((programme) =>
          programme.id === id ? updated : programme
        )
      )
    ) {
      return storageError("Could not save the programme on this device.");
    }
    return { record: updated, status: "saved" };
  },
};
