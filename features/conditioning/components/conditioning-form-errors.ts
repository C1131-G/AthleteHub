export type ConditioningFormErrors = Record<string, string>;

/**
 * Result ids are crypto UUIDs, which can start with a digit, so errors focus
 * via an attribute selector instead of `#id`.
 */
export const focusFirstError = (errors: ConditioningFormErrors) => {
  const [field] = Object.keys(errors);
  if (field) {
    document.querySelector<HTMLElement>(`[id="${field}"]`)?.focus();
  }
};

export const errorId = (field: string) => `${field}-error`;
