import { z } from "zod";

export const assessmentTypes = [
  "mentis",
  "dartfish",
  "ring-shot",
  "psychology",
] as const;
export const assessmentTypeSchema = z.enum(assessmentTypes);
export type AssessmentType = z.infer<typeof assessmentTypeSchema>;
const localDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year ?? 0, (month ?? 0) - 1, day ?? 0));
    return date.toISOString().slice(0, 10) === value;
  }, "Use a real calendar date.");
const optionalScore = z.number().finite().min(0).max(10).optional();
const common = {
  assessedOn: localDate,
  athleteId: z.string().min(1),
  weeklyReportId: z.string().optional(),
};
const mentis = {
  assessmentType: z.literal("mentis"),
  bowCant: z.number().finite().optional(),
  holdDurationSeconds: z.number().positive().optional(),
  holdStability: optionalScore,
  setupStability: optionalScore,
};
const dartfish = {
  assessmentType: z.literal("dartfish"),
  elbowAngleDegrees: z.number().finite().min(0).max(180).optional(),
  technicalNotes: z.string(),
};
const ringShot = {
  actionItems: z.array(z.string()),
  assessmentType: z.literal("ring-shot"),
  strengths: z.array(z.string()),
};
const psychology = {
  assessmentType: z.literal("psychology"),
  baselineAlpha: optionalScore,
  baselineBeta: optionalScore,
  baselineGamma: optionalScore,
  baselineSymmetry: optionalScore,
  concerns: z.array(z.string()),
  interpretation: z.string(),
  recommendations: z.array(z.string()),
  strengths: z.array(z.string()),
  visualizationAlpha: optionalScore,
  visualizationBeta: optionalScore,
  visualizationGamma: optionalScore,
  visualizationSymmetry: optionalScore,
};
const hasMeaningfulValue = (value: unknown) => {
  if (value === undefined) {
    return false;
  }
  const textValue = String(value).trim();
  return Boolean(textValue) && textValue !== "[]";
};
const hasContent = <T extends { athleteId: string; assessedOn: string }>(
  value: T,
  context: z.RefinementCtx
) => {
  const fields = Object.entries(value).filter(
    ([key]) =>
      !["athleteId", "assessedOn", "assessmentType", "weeklyReportId"].includes(
        key
      )
  );
  if (!fields.map(([, item]) => item).some(hasMeaningfulValue)) {
    context.addIssue({
      code: "custom",
      message: "Record at least one assessment result or note.",
      path: ["assessmentType"],
    });
  }
  if (value.assessedOn > new Date().toISOString().slice(0, 10)) {
    context.addIssue({
      code: "custom",
      message: "Assessment date cannot be in the future.",
      path: ["assessedOn"],
    });
  }
};
export const assessmentInputSchema = z.discriminatedUnion("assessmentType", [
  z.object({ ...common, ...mentis }).superRefine(hasContent),
  z.object({ ...common, ...dartfish }).superRefine(hasContent),
  z.object({ ...common, ...ringShot }).superRefine(hasContent),
  z.object({ ...common, ...psychology }).superRefine(hasContent),
]);
export const assessmentSchema = z.discriminatedUnion("assessmentType", [
  z.object({
    ...common,
    ...mentis,
    createdAt: z.string(),
    id: z.string().min(1),
    updatedAt: z.string(),
  }),
  z.object({
    ...common,
    ...dartfish,
    createdAt: z.string(),
    id: z.string().min(1),
    updatedAt: z.string(),
  }),
  z.object({
    ...common,
    ...ringShot,
    createdAt: z.string(),
    id: z.string().min(1),
    updatedAt: z.string(),
  }),
  z.object({
    ...common,
    ...psychology,
    createdAt: z.string(),
    id: z.string().min(1),
    updatedAt: z.string(),
  }),
]);
export type Assessment = z.infer<typeof assessmentSchema>;
export type AssessmentInput = z.infer<typeof assessmentInputSchema>;
export type AssessmentMutationResult =
  | { assessment: Assessment; status: "saved" }
  | {
      fieldErrors: Record<string, string>;
      status: "duplicate" | "invalid" | "not-found" | "storage-error";
    };
export const assessmentTypeLabel = {
  dartfish: "Dartfish",
  mentis: "Mentis",
  psychology: "Psychology",
  "ring-shot": "Ring Shot",
} satisfies Record<AssessmentType, string>;
