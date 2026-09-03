/**
 * Errors are keyed by the id of the control they belong to, so the summary, the
 * `aria-errormessage` link, and the focus target all resolve from one value.
 */
export type PlanFormErrors = Record<string, string>;

export const errorId = (controlId: string) => `${controlId}-error`;

/** Schema and repository paths do not know about the DOM; this bridges them. */
const controlForPath = {
  athleteId: "plan-athlete",
  endsOn: "plan-ends-on",
  events: "plan-events",
  form: "plan-name",
  name: "plan-name",
  startsOn: "plan-starts-on",
  status: "plan-status",
  strategyNotes: "plan-strategy",
  targetDistanceM: "plan-target-distance",
  targetScore: "plan-target-score",
  weeks: "plan-weeks",
} satisfies Record<string, string>;

const isKnownPath = (path: string): path is keyof typeof controlForPath =>
  path in controlForPath;

export const toFormErrors = (fieldErrors: Record<string, string>) => {
  const errors: PlanFormErrors = {};
  for (const [path, message] of Object.entries(fieldErrors)) {
    errors[isKnownPath(path) ? controlForPath[path] : path] = message;
  }
  return errors;
};

export const focusFirstError = (errors: PlanFormErrors) => {
  const [controlId] = Object.keys(errors);
  if (!controlId) {
    return;
  }
  const control = document.querySelector<HTMLElement>(`#${controlId}`);
  control?.focus();
  control?.scrollIntoView({ block: "center" });
};

/** Marks a control invalid and points assistive tech at its message. */
export const fieldProps = (controlId: string, errors: PlanFormErrors) =>
  errors[controlId]
    ? {
        "aria-errormessage": errorId(controlId),
        "aria-invalid": true as const,
      }
    : {};
