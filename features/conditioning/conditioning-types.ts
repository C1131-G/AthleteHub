import { z } from "zod";

export const conditioningAssessmentStatuses = [
  "completed",
  "partial",
  "medical-exemption",
  "absent",
] as const;

export const conditioningRatings = [
  "poor",
  "average",
  "good",
  "excellent",
] as const;

export const conditioningCategories = [
  "muscular-endurance",
  "isometric",
  "aerobic",
  "custom",
] as const;

export const conditioningUnits = [
  "repetitions",
  "seconds",
  "kilograms",
  "centimeters",
  "score",
  "custom",
] as const;

export const conditioningPhases = [
  "foundation",
  "development",
  "competition",
  "recovery",
  "return-to-training",
  "custom",
] as const;

export const conditioningProgrammeStatuses = [
  "draft",
  "active",
  "completed",
] as const;

export const sessionIntensities = [
  "recovery",
  "low",
  "moderate",
  "high",
] as const;

export const conditioningAssessmentStatusSchema = z.enum(
  conditioningAssessmentStatuses
);
export const conditioningRatingSchema = z.enum(conditioningRatings);
export const conditioningCategorySchema = z.enum(conditioningCategories);
export const conditioningUnitSchema = z.enum(conditioningUnits);
export const conditioningPhaseSchema = z.enum(conditioningPhases);
export const conditioningProgrammeStatusSchema = z.enum(
  conditioningProgrammeStatuses
);
export const sessionIntensitySchema = z.enum(sessionIntensities);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year ?? 0, (month ?? 0) - 1, day ?? 0));
    return (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === (month ?? 0) - 1 &&
      parsed.getUTCDate() === day
    );
  }, "Use a real calendar date.");
const nonNegativeNumber = z.number().min(0);
const stringList = z.array(z.string());
const clockTime = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Use a HH:MM time.")
  .refine((value) => {
    const [hour, minute] = value.split(":").map(Number);
    return (
      (hour ?? -1) >= 0 &&
      (hour ?? 24) <= 23 &&
      (minute ?? -1) >= 0 &&
      (minute ?? 60) <= 59
    );
  }, "Use a real clock time.");

export const conditioningTestResultSchema = z
  .object({
    category: conditioningCategorySchema,
    customUnit: z.string().optional(),
    id: z.string().min(1),
    improvementDirection: z.enum(["higher", "lower"]),
    key: z.string().min(1),
    label: z.string().min(1, "Every test needs a label."),
    notes: z.string(),
    protocol: z.string(),
    rating: conditioningRatingSchema,
    unit: conditioningUnitSchema,
    value: z.number().positive("Test values must be greater than zero."),
  })
  .superRefine((result, context) => {
    if (result.unit === "custom" && !result.customUnit?.trim()) {
      context.addIssue({
        code: "custom",
        message: "A custom unit needs a unit label.",
        path: ["customUnit"],
      });
    }
    if (result.unit === "repetitions" && !Number.isInteger(result.value)) {
      context.addIssue({
        code: "custom",
        message: "Repetition counts must be whole numbers.",
        path: ["value"],
      });
    }
    if (!result.protocol.trim()) {
      context.addIssue({
        code: "custom",
        message: "Add the test protocol.",
        path: ["protocol"],
      });
    }
  });

export const conditioningAssessmentSchema = z.object({
  assessedOn: isoDate,
  athleteId: z.string().min(1),
  coachSummary: z.string(),
  createdAt: z.string(),
  developmentAreas: stringList,
  id: z.string().min(1),
  recommendations: stringList,
  restrictionNotes: z.string(),
  results: z.array(conditioningTestResultSchema),
  status: conditioningAssessmentStatusSchema,
  strengths: stringList,
  updatedAt: z.string(),
});

export const conditioningExerciseSchema = z.object({
  distanceM: nonNegativeNumber.optional(),
  durationSeconds: nonNegativeNumber.optional(),
  id: z.string().min(1),
  loadKg: nonNegativeNumber.optional(),
  name: z.string().min(1, "Every exercise needs a name."),
  notes: z.string(),
  reps: z.number().int().min(0).optional(),
  restSeconds: nonNegativeNumber.optional(),
  rpe: z.number().min(1).max(10).optional(),
  sets: z.number().int().min(0).optional(),
});

export const conditioningSessionSchema = z
  .object({
    dayLabel: z.string().optional(),
    endsAt: clockTime,
    exercises: z.array(conditioningExerciseSchema),
    id: z.string().min(1),
    intensity: sessionIntensitySchema,
    notes: z.string(),
    startsAt: clockTime,
    title: z.string().min(1, "Every session needs a title."),
    type: z.string().min(1),
    weekday: z.number().int().min(0).max(6),
  })
  .superRefine((session, context) => {
    if (session.endsAt <= session.startsAt) {
      context.addIssue({
        code: "custom",
        message: "The session end time must be after the start time.",
        path: ["endsAt"],
      });
    }
    if (
      (session.intensity === "recovery" ||
        session.type.toLowerCase().includes("return")) &&
      !session.notes.trim()
    ) {
      context.addIssue({
        code: "custom",
        message: "Recovery and return-to-training sessions need a note.",
        path: ["notes"],
      });
    }
    const isRecovery =
      session.intensity === "recovery" ||
      /^(?:recovery|rest)$/i.test(session.type);
    if (isRecovery && session.exercises.length > 0) {
      context.addIssue({
        code: "custom",
        message: "Recovery sessions cannot contain exercise prescriptions.",
        path: ["exercises"],
      });
    }
  });

export const conditioningProgrammeSchema = z.object({
  athleteId: z.string().min(1),
  createdAt: z.string(),
  customPhase: z.string().optional(),
  endsOn: isoDate,
  id: z.string().min(1),
  objectives: stringList,
  phase: conditioningPhaseSchema,
  restrictionNotes: z.string(),
  sessions: z.array(conditioningSessionSchema),
  startsOn: isoDate,
  status: conditioningProgrammeStatusSchema,
  title: z.string().min(1, "A programme needs a title."),
  trainingPlanId: z.string().optional(),
  updatedAt: z.string(),
});

const explanatoryStatuses = new Set<string>(["medical-exemption", "absent"]);

export const conditioningAssessmentInputSchema = conditioningAssessmentSchema
  .omit({ createdAt: true, id: true, updatedAt: true })
  .superRefine((assessment, context) => {
    if (
      explanatoryStatuses.has(assessment.status) &&
      !assessment.coachSummary.trim()
    ) {
      context.addIssue({
        code: "custom",
        message:
          "A medical exemption or absence needs an explanatory note in the coach summary.",
        path: ["coachSummary"],
      });
    }
    if (assessment.status === "completed" && assessment.results.length === 0) {
      context.addIssue({
        code: "custom",
        message: "A completed assessment needs at least one test result.",
        path: ["results"],
      });
    }
    const seenLabels = new Set<string>();
    for (const result of assessment.results) {
      const label = result.label.trim().toLowerCase();
      if (seenLabels.has(label)) {
        context.addIssue({
          code: "custom",
          message: `Test "${result.label}" is listed more than once.`,
          path: ["results"],
        });
      }
      seenLabels.add(label);
    }
  });

export const conditioningProgrammeInputSchema = conditioningProgrammeSchema
  .omit({ createdAt: true, id: true, updatedAt: true })
  .superRefine((programme, context) => {
    if (programme.endsOn < programme.startsOn) {
      context.addIssue({
        code: "custom",
        message: "The programme end date cannot be before the start date.",
        path: ["endsOn"],
      });
    }
    if (programme.phase === "custom" && !programme.customPhase?.trim()) {
      context.addIssue({
        code: "custom",
        message: "Name the custom phase.",
        path: ["customPhase"],
      });
    }
    if (programme.sessions.length === 0) {
      context.addIssue({
        code: "custom",
        message: "Add at least one weekly session.",
        path: ["sessions"],
      });
    }
  });

export type ConditioningAssessmentStatus = z.infer<
  typeof conditioningAssessmentStatusSchema
>;
export type ConditioningRating = z.infer<typeof conditioningRatingSchema>;
export type ConditioningCategory = z.infer<typeof conditioningCategorySchema>;
export type ConditioningUnit = z.infer<typeof conditioningUnitSchema>;
export type ConditioningPhase = z.infer<typeof conditioningPhaseSchema>;
export type ConditioningProgrammeStatus = z.infer<
  typeof conditioningProgrammeStatusSchema
>;
export type SessionIntensity = z.infer<typeof sessionIntensitySchema>;
export type ConditioningTestResult = z.infer<
  typeof conditioningTestResultSchema
>;
export type ConditioningAssessment = z.infer<
  typeof conditioningAssessmentSchema
>;
export type ConditioningAssessmentInput = z.infer<
  typeof conditioningAssessmentInputSchema
>;
export type ConditioningExercise = z.infer<typeof conditioningExerciseSchema>;
export type ConditioningSession = z.infer<typeof conditioningSessionSchema>;
export type ConditioningProgramme = z.infer<typeof conditioningProgrammeSchema>;
export type ConditioningProgrammeInput = z.infer<
  typeof conditioningProgrammeInputSchema
>;

export type ConditioningMutationResult<T> =
  | { record: T; status: "saved" }
  | {
      fieldErrors: Record<string, string>;
      status: "duplicate" | "invalid" | "not-found" | "storage-error";
    };

export interface ConditioningRepository {
  createAssessment: (
    input: ConditioningAssessmentInput
  ) => ConditioningMutationResult<ConditioningAssessment>;
  createProgramme: (
    input: ConditioningProgrammeInput
  ) => ConditioningMutationResult<ConditioningProgramme>;
  getAssessment: (id: string) => ConditioningAssessment | undefined;
  getProgramme: (id: string) => ConditioningProgramme | undefined;
  listAssessments: () => ConditioningAssessment[];
  listProgrammes: () => ConditioningProgramme[];
  updateAssessment: (
    id: string,
    input: ConditioningAssessmentInput
  ) => ConditioningMutationResult<ConditioningAssessment>;
  updateProgramme: (
    id: string,
    input: ConditioningProgrammeInput
  ) => ConditioningMutationResult<ConditioningProgramme>;
}

export const assessmentStatusLabel = {
  absent: "Absent",
  completed: "Completed",
  "medical-exemption": "Medical exemption",
  partial: "Partial",
} satisfies Record<ConditioningAssessmentStatus, string>;

export const ratingLabel = {
  average: "Average",
  excellent: "Excellent",
  good: "Good",
  poor: "Poor",
} satisfies Record<ConditioningRating, string>;

export const phaseLabel = {
  competition: "Competition",
  custom: "Custom",
  development: "Development",
  foundation: "Foundation",
  recovery: "Recovery",
  "return-to-training": "Return to training",
} satisfies Record<ConditioningPhase, string>;

export const programmeStatusLabel = {
  active: "Active",
  completed: "Completed",
  draft: "Draft",
} satisfies Record<ConditioningProgrammeStatus, string>;

export const intensityLabel = {
  high: "High",
  low: "Low",
  moderate: "Moderate",
  recovery: "Recovery",
} satisfies Record<SessionIntensity, string>;

export const categoryLabel = {
  aerobic: "Aerobic",
  custom: "Custom",
  isometric: "Isometric",
  "muscular-endurance": "Muscular endurance",
} satisfies Record<ConditioningCategory, string>;

/**
 * Safe parsers for form payloads: a value outside the union falls back to the
 * first entry instead of failing, so Select changes never need assertions.
 */
export const toAssessmentStatus = (
  value: string
): ConditioningAssessmentStatus =>
  conditioningAssessmentStatusSchema.catch("completed").parse(value);
export const toConditioningRating = (value: string): ConditioningRating =>
  conditioningRatingSchema.catch("average").parse(value);
export const toConditioningUnit = (value: string): ConditioningUnit =>
  conditioningUnitSchema.catch("repetitions").parse(value);
export const toConditioningPhase = (value: string): ConditioningPhase =>
  conditioningPhaseSchema.catch("foundation").parse(value);
export const toProgrammeStatus = (value: string): ConditioningProgrammeStatus =>
  conditioningProgrammeStatusSchema.catch("draft").parse(value);
export const toSessionIntensity = (value: string): SessionIntensity =>
  sessionIntensitySchema.catch("moderate").parse(value);

export const unitLabel = {
  centimeters: "cm",
  custom: "",
  kilograms: "kg",
  repetitions: "reps",
  score: "score",
  seconds: "s",
} satisfies Record<ConditioningUnit, string>;
