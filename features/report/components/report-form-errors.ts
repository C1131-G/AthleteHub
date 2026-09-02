export type ReportFormErrors = Record<string, string>;

export const errorId = (field: string) => `${field}-error`;

export const firstErrorField = (errors: ReportFormErrors) =>
  Object.keys(errors)[0];

export const focusFirstError = (errors: ReportFormErrors) => {
  const field = firstErrorField(errors);
  if (field) {
    document.querySelector<HTMLElement>(`#${field}`)?.focus();
  }
};
