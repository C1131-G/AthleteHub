/**
 * The failure half of every mutation result.
 *
 * Each feature names its success payload differently (`record`, `report`,
 * `assessment`, `session`), but the failure branch is identical everywhere:
 * a status plus the field errors a form can render. Sharing it keeps the nine
 * services from drifting apart on error handling.
 */
export interface MutationFailure {
  fieldErrors: Record<string, string>;
  status: "duplicate" | "invalid" | "not-found" | "storage-error";
}

interface IssueLike {
  message: string;
  path: PropertyKey[];
}

/**
 * Keyed by the top-level field, because that is what the forms label their
 * controls with — an issue at `weeks.2.arrowsPlanned` has to reach the "weeks"
 * control to be shown at all. The first issue for a field wins, matching the
 * repositories these services replaced.
 */
export const invalidResult = (error: {
  issues: readonly IssueLike[];
}): MutationFailure => {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const [field] = issue.path;
    const key = field === undefined ? "form" : String(field);
    fieldErrors[key] ??= issue.message;
  }
  return { fieldErrors, status: "invalid" };
};

export const duplicateResult = (
  fieldErrors: Record<string, string>
): MutationFailure => ({ fieldErrors, status: "duplicate" });

export const notFoundResult = (message: string): MutationFailure => ({
  fieldErrors: { form: message },
  status: "not-found",
});

export const storageErrorResult = (message: string): MutationFailure => ({
  fieldErrors: { form: message },
  status: "storage-error",
});

/**
 * Prisma reports a broken unique constraint as P2002. The duplicate guards used
 * to be hand-rolled scans in each repository; the database enforces them now,
 * so the services translate that one code back into a `duplicate` result.
 */
const hasErrorCode = (value: unknown): value is { code: unknown } =>
  typeof value === "object" && value !== null && "code" in value;

export const isUniqueViolation = (error: unknown): boolean =>
  hasErrorCode(error) && error.code === "P2002";
