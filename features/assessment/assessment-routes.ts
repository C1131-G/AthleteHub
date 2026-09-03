export const assessmentHref = (id: string) =>
  `/reports/assessments/${id}` as const;
export const assessmentEditHref = (id: string) =>
  `/reports/assessments/${id}/edit` as const;
export const assessmentNewHref = (
  athleteId?: string,
  assessedOn?: string,
  returnTo?: string | undefined
) => {
  const query = new URLSearchParams();
  if (athleteId) {
    query.set("athleteId", athleteId);
  }
  if (assessedOn) {
    query.set("assessedOn", assessedOn);
  }
  if (returnTo) {
    query.set("returnTo", returnTo);
  }
  const encoded = query.toString();
  return encoded
    ? (`/reports/assessments/new?${encoded}` as const)
    : ("/reports/assessments/new" as const);
};
export const queryValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

export const safeReturnHref = (value: string | undefined) => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return;
  }

  if (
    !value.startsWith("/reports") &&
    !value.startsWith("/monthly-cycles") &&
    !value.startsWith("/athletes")
  ) {
    return;
  }

  return value;
};
