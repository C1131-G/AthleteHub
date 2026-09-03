/**
 * Errors are keyed by the id of the control they belong to, so the summary, the
 * `aria-errormessage` link, and the focus target all resolve from one value.
 */
export type ReportFormErrors = Record<string, string>;

export const errorId = (controlId: string) => `${controlId}-error`;

/**
 * Schema and repository paths do not know about the DOM, so each form brings
 * its own bridge: the same `athleteId` path is a different control in each.
 */
export type ControlMap = Readonly<Record<string, string>>;

export const weeklyControls = {
  absenceReason: "absence-reason",
  arrowsPlanned: "arrows-planned",
  arrowsShot: "arrows-shot",
  athleteId: "weekly-athlete",
  distanceM: "weekly-distance",
  maxScore: "max-score",
  scores: "score-one",
  trainingDays: "training-days",
  weekStart: "week-start",
} satisfies ControlMap;

export const monthlyControls = {
  athleteId: "monthly-athlete",
  coachSummary: "coach-summary",
  month: "report-month",
  performanceHighlights: "highlights",
  status: "monthly-status",
  weeklyArrowTargets: "arrow-targets",
} satisfies ControlMap;

/** Re-keys schema paths onto the control ids the form actually renders. */
export const toFormErrors = (
  fieldErrors: Record<string, string>,
  controls: ControlMap
) => {
  const errors: ReportFormErrors = {};
  for (const [path, message] of Object.entries(fieldErrors)) {
    errors[controls[path] ?? path] = message;
  }
  return errors;
};

export const firstErrorField = (errors: ReportFormErrors) =>
  Object.keys(errors)[0];

export const focusFirstError = (errors: ReportFormErrors) => {
  const controlId = firstErrorField(errors);
  if (!controlId) {
    return;
  }
  const control = document.querySelector<HTMLElement>(`#${controlId}`);
  control?.focus();
  control?.scrollIntoView({ block: "center" });
};

/** Marks a control invalid and points assistive tech at its message. */
export const fieldProps = (controlId: string, errors: ReportFormErrors) =>
  errors[controlId]
    ? {
        "aria-errormessage": errorId(controlId),
        "aria-invalid": true as const,
      }
    : {};
