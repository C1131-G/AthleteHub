import { z } from "zod";

export const weeklyEntryStatuses = [
  "completed",
  "competition",
  "medical-leave",
  "absent",
] as const;

export const weeklyEntryStatusSchema = z.enum(weeklyEntryStatuses);
export const monthlyReportStatusSchema = z.enum(["draft", "complete"]);

const optionalNumber = z.number().finite().optional();
const nonNegative = z.number().int().min(0);
const stringList = z.array(z.string());

export const weeklyReportSchema = z.object({
  absenceReason: z.string(),
  actionItems: stringList,
  arrowsPlanned: nonNegative.optional(),
  arrowsShot: nonNegative.optional(),
  athleteId: z.string().min(1),
  createdAt: z.string(),
  distanceM: optionalNumber,
  equipmentSetupId: z.string().optional(),
  id: z.string().min(1),
  maxScore: optionalNumber,
  performanceNotes: z.string(),
  scores: z.array(z.number().int().min(0)).max(4),
  status: weeklyEntryStatusSchema,
  trainingDays: z.number().int().min(0).max(7).optional(),
  updatedAt: z.string(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const mentisMetricsSchema = z.object({
  bowCant: z.string(),
  holdTimeSeconds: optionalNumber,
  stabilityScore: optionalNumber,
});

export const monthlyAssessmentsSchema = z.object({
  conditioningPlan: z.string(),
  conditioningTests: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      rating: z.string(),
      unit: z.string(),
      value: z.string(),
    })
  ),
  dartfishNotes: z.string(),
  elbowAngleDegrees: optionalNumber,
  mentis: z
    .object({
      hold: mentisMetricsSchema,
      recordedAt: z.string(),
      setup: mentisMetricsSchema,
    })
    .optional(),
  psychology: z
    .object({
      baseline: z.object({
        alpha: optionalNumber,
        beta: optionalNumber,
        gamma: optionalNumber,
        symmetry: optionalNumber,
      }),
      concerns: stringList,
      interpretation: z.string(),
      recommendations: stringList,
      recordedAt: z.string(),
      strengths: stringList,
      visualization: z.object({
        alpha: optionalNumber,
        beta: optionalNumber,
        gamma: optionalNumber,
        symmetry: optionalNumber,
      }),
    })
    .optional(),
  ringShotActions: stringList,
  ringShotStrengths: stringList,
});

export const monthlyReportSchema = z.object({
  actionItems: stringList,
  assessments: monthlyAssessmentsSchema,
  athleteId: z.string().min(1),
  coachSummary: z.string(),
  createdAt: z.string(),
  exceptionReason: z.string(),
  id: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  nextMonthPlan: z.object({
    notes: z.string(),
    targetDistanceM: optionalNumber,
    targetScore: optionalNumber,
    weeklyArrowTargets: z.array(nonNegative),
  }),
  performanceHighlights: z.string(),
  status: monthlyReportStatusSchema,
  updatedAt: z.string(),
});

export const weeklyReportInputSchema = weeklyReportSchema
  .omit({ createdAt: true, id: true, updatedAt: true })
  .superRefine((report, context) => {
    if (
      ["medical-leave", "absent"].includes(report.status) &&
      !report.absenceReason.trim()
    ) {
      context.addIssue({
        code: "custom",
        message: "A reason is required for this status.",
        path: ["absenceReason"],
      });
    }
    const { maxScore } = report;
    if (
      maxScore !== undefined &&
      report.scores.some((score) => score > maxScore)
    ) {
      context.addIssue({
        code: "custom",
        message: "Scores cannot exceed the maximum score.",
        path: ["scores"],
      });
    }
  });
export const monthlyReportInputSchema = monthlyReportSchema
  .omit({ createdAt: true, id: true, updatedAt: true })
  .superRefine((report, context) => {
    if (
      report.status === "complete" &&
      !report.coachSummary.trim() &&
      !report.exceptionReason.trim()
    ) {
      context.addIssue({
        code: "custom",
        message: "A complete report needs a summary or exception reason.",
        path: ["coachSummary"],
      });
    }
  });

export type WeeklyEntryStatus = z.infer<typeof weeklyEntryStatusSchema>;
export type MonthlyReportStatus = z.infer<typeof monthlyReportStatusSchema>;
export type WeeklyPerformanceReport = z.infer<typeof weeklyReportSchema>;
export type MonthlyPerformanceReport = z.infer<typeof monthlyReportSchema>;
export type WeeklyPerformanceReportInput = z.infer<
  typeof weeklyReportInputSchema
>;
export type MonthlyPerformanceReportInput = z.infer<
  typeof monthlyReportInputSchema
>;
export type MonthlyAssessments = z.infer<typeof monthlyAssessmentsSchema>;

export interface ScoreSummary {
  average: number;
  distanceM: number;
  rounds: number;
  total: number;
}

export type ReportMutationResult<T> =
  | { report: T; status: "saved" }
  | {
      fieldErrors: Record<string, string>;
      status: "duplicate" | "invalid" | "not-found";
    };

export interface ReportRepository {
  createMonthly: (
    input: MonthlyPerformanceReportInput
  ) => ReportMutationResult<MonthlyPerformanceReport>;
  createWeekly: (
    input: WeeklyPerformanceReportInput
  ) => ReportMutationResult<WeeklyPerformanceReport>;
  getMonthly: (id: string) => MonthlyPerformanceReport | undefined;
  getWeekly: (id: string) => WeeklyPerformanceReport | undefined;
  listMonthly: () => MonthlyPerformanceReport[];
  listWeekly: () => WeeklyPerformanceReport[];
  updateMonthly: (
    id: string,
    input: MonthlyPerformanceReportInput
  ) => ReportMutationResult<MonthlyPerformanceReport>;
  updateWeekly: (
    id: string,
    input: WeeklyPerformanceReportInput
  ) => ReportMutationResult<WeeklyPerformanceReport>;
}
