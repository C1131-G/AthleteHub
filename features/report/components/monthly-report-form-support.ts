import type { MonthlyPerformanceReportInput } from "../report-types";
import type { MonthlyFormState } from "./monthly-report-fields";

export interface MonthlyReportFormProps {
  initialAthleteId?: string | undefined;
  initialMonth?: string | undefined;
  reportId?: string | undefined;
}

export const toState = (
  input: MonthlyPerformanceReportInput
): MonthlyFormState => ({
  actionItems: input.actionItems.join("\n"),
  athleteId: input.athleteId,
  coachSummary: input.coachSummary,
  conditioningPlan: input.assessments.conditioningPlan,
  dartfishNotes: input.assessments.dartfishNotes,
  exceptionReason: input.exceptionReason,
  month: input.month,
  performanceHighlights: input.performanceHighlights,
  planNotes: input.nextMonthPlan.notes,
  status: input.status,
  targetDistanceM: String(input.nextMonthPlan.targetDistanceM ?? ""),
  targetScore: String(input.nextMonthPlan.targetScore ?? ""),
  weeklyArrowTargets: input.nextMonthPlan.weeklyArrowTargets.join(", "),
});

export const numberOrUndefined = (value: string) => {
  if (!value.trim()) {
    return;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};
