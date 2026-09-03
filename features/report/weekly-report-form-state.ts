import type { ReportFormErrors } from "./components/report-form-errors";
import type {
  PlanWeekMatch,
  WeeklyFormState,
} from "./components/weekly-report-fields";
import type {
  WeeklyPerformanceReport,
  WeeklyPerformanceReportInput,
} from "./report-types";

export const blankWeeklyFormState = (athleteId = ""): WeeklyFormState => ({
  absenceReason: "",
  actionItems: "",
  arrowsPlanned: "",
  arrowsShot: "",
  athleteId,
  distanceM: "",
  maxScore: "360",
  performanceNotes: "",
  scores: ["", "", "", ""],
  status: "completed",
  trainingDays: "",
  weekStart: "",
});

export const weeklyFormStateFromReport = (
  existing: WeeklyPerformanceReport
): WeeklyFormState => ({
  absenceReason: existing.absenceReason,
  actionItems: existing.actionItems.join("\n"),
  arrowsPlanned: String(existing.arrowsPlanned ?? ""),
  arrowsShot: String(existing.arrowsShot ?? ""),
  athleteId: existing.athleteId,
  distanceM: String(existing.distanceM ?? ""),
  maxScore: String(existing.maxScore ?? 360),
  performanceNotes: existing.performanceNotes,
  scores: [...existing.scores.map(String), "", "", "", ""].slice(0, 4),
  status: existing.status,
  trainingDays: String(existing.trainingDays ?? ""),
  weekStart: existing.weekStart,
});

export const parseNumberField = (value: string) => {
  if (!value.trim()) {
    return;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const parseScores = (form: WeeklyFormState) =>
  form.scores
    .map(parseNumberField)
    .filter((score): score is number => score !== undefined);

export const validateWeeklyForm = (form: WeeklyFormState): ReportFormErrors => {
  const errors: ReportFormErrors = {};
  const today = new Date().toISOString().slice(0, 10);
  if (!form.athleteId) {
    errors.athleteId = "Select an athlete.";
  }
  if (!form.weekStart) {
    errors.weekStart = "Choose the week start date.";
  }
  if (form.weekStart > today) {
    errors.weekStart = "The week start cannot be in the future.";
  }
  if (
    ["medical-leave", "absent"].includes(form.status) &&
    !form.absenceReason.trim()
  ) {
    errors.absenceReason = "Add a reason for leave or absence.";
  }
  const maxScore = parseNumberField(form.maxScore);
  const scores = parseScores(form);
  if (form.status === "completed" || form.status === "competition") {
    const distanceM = parseNumberField(form.distanceM);
    if (!distanceM || distanceM <= 0) {
      errors.distanceM = "Distance must be positive.";
    }
    if (!maxScore || maxScore <= 0) {
      errors.maxScore = "Maximum score must be positive.";
    }
    if (!scores.length) {
      errors.scores = "Add at least one score.";
    }
    if (maxScore && scores.some((score) => score < 0 || score > maxScore)) {
      errors.scores = "Scores must be within the maximum score.";
    }
  }
  const trainingDays = parseNumberField(form.trainingDays);
  if (trainingDays !== undefined && (trainingDays < 0 || trainingDays > 7)) {
    errors.trainingDays = "Training days must be between 0 and 7.";
  }
  return errors;
};

/** A plan week matching this athlete and week owns the arrow target. */
export const weeklyInputFromForm = (
  form: WeeklyFormState,
  planWeek: PlanWeekMatch | undefined,
  equipmentSetupId?: string
): WeeklyPerformanceReportInput => ({
  absenceReason: form.absenceReason,
  actionItems: form.actionItems.split("\n").filter(Boolean),
  arrowsPlanned: planWeek
    ? planWeek.week.arrowsPlanned
    : parseNumberField(form.arrowsPlanned),
  arrowsShot: parseNumberField(form.arrowsShot),
  athleteId: form.athleteId,
  distanceM: parseNumberField(form.distanceM),
  equipmentSetupId,
  maxScore: parseNumberField(form.maxScore),
  performanceNotes: form.performanceNotes,
  scores: parseScores(form),
  status: form.status,
  trainingDays: parseNumberField(form.trainingDays),
  trainingPlanId: planWeek?.plan.id,
  trainingPlanWeekId: planWeek?.week.id,
  weekStart: form.weekStart,
});
