import "client-only";
import {
  monthlyReportInputSchema,
  monthlyReportSchema,
  weeklyReportInputSchema,
  weeklyReportSchema,
} from "./report-types";
import type {
  MonthlyPerformanceReport,
  MonthlyPerformanceReportInput,
  ReportMutationResult,
  ReportRepository,
  WeeklyPerformanceReport,
  WeeklyPerformanceReportInput,
} from "./report-types";

const WEEKLY_KEY = "athletehub.weekly-reports.v1";
const MONTHLY_KEY = "athletehub.monthly-reports.v1";

const canUseStorage = () => globalThis.localStorage !== undefined;

interface ParseSchema<T> {
  safeParse: (value: unknown) =>
    | { data: T; success: true }
    | {
        error: { flatten: () => { fieldErrors: Record<string, string[]> } };
        success: false;
      };
}

const read = <T>(key: string, schema: ParseSchema<T>) => {
  if (!canUseStorage()) {
    return [];
  }
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.flatMap((value) => {
      const result = schema.safeParse(value);
      return result.success ? [result.data] : [];
    });
  } catch {
    return [];
  }
};

const write = (key: string, value: unknown[]) => {
  if (canUseStorage()) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
};

const sortByDate = <T extends { createdAt: string }>(
  records: T[],
  key: keyof T
) =>
  records.toSorted((a, b) =>
    `${String(b[key])}${b.createdAt}`.localeCompare(
      `${String(a[key])}${a.createdAt}`
    )
  );

const invalid = <T>(
  fieldErrors: Record<string, string>
): ReportMutationResult<T> => ({
  fieldErrors,
  status: "invalid",
});

const cleanWeekly = (input: WeeklyPerformanceReportInput) => ({
  ...input,
  absenceReason: input.absenceReason.trim(),
  actionItems: input.actionItems.flatMap((item) =>
    item.trim() ? [item.trim()] : []
  ),
  performanceNotes: input.performanceNotes.trim(),
});

const cleanMonthly = (input: MonthlyPerformanceReportInput) => ({
  ...input,
  actionItems: input.actionItems.flatMap((item) =>
    item.trim() ? [item.trim()] : []
  ),
  assessments: input.assessments,
  coachSummary: input.coachSummary.trim(),
  exceptionReason: input.exceptionReason.trim(),
  performanceHighlights: input.performanceHighlights.trim(),
});

const fieldErrors = (error: {
  flatten: () => { fieldErrors: Record<string, string[]> };
}) => {
  const errors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(error.flatten().fieldErrors)) {
    const [message] = messages;
    if (message) {
      errors[field] = message;
    }
  }
  return errors;
};

const validateWeekly = (input: WeeklyPerformanceReportInput) => {
  const result = weeklyReportInputSchema.safeParse(cleanWeekly(input));
  if (!result.success) {
    return { fieldErrors: fieldErrors(result.error), valid: false as const };
  }
  return { input: result.data, valid: true as const };
};

const validateMonthly = (input: MonthlyPerformanceReportInput) => {
  const result = monthlyReportInputSchema.safeParse(cleanMonthly(input));
  if (!result.success) {
    return { fieldErrors: fieldErrors(result.error), valid: false as const };
  }
  return { input: result.data, valid: true as const };
};

export const reportRepository: ReportRepository = {
  createMonthly: (input) => {
    const valid = validateMonthly(input);
    if (!valid.valid) {
      return invalid<MonthlyPerformanceReport>(valid.fieldErrors);
    }
    const reports = read(MONTHLY_KEY, monthlyReportSchema);
    if (
      reports.some(
        (report) =>
          report.athleteId === valid.input.athleteId &&
          report.month === valid.input.month
      )
    ) {
      return {
        fieldErrors: {
          month: "A monthly report already exists for this athlete and month.",
        },
        status: "duplicate",
      };
    }
    const now = new Date().toISOString();
    const report = {
      ...valid.input,
      createdAt: now,
      id: crypto.randomUUID(),
      updatedAt: now,
    } satisfies MonthlyPerformanceReport;
    write(MONTHLY_KEY, [report, ...reports]);
    return { report, status: "saved" };
  },
  createWeekly: (input) => {
    const valid = validateWeekly(input);
    if (!valid.valid) {
      return invalid<WeeklyPerformanceReport>(valid.fieldErrors);
    }
    const reports = read(WEEKLY_KEY, weeklyReportSchema);
    if (
      reports.some(
        (report) =>
          report.athleteId === valid.input.athleteId &&
          report.weekStart === valid.input.weekStart
      )
    ) {
      return {
        fieldErrors: {
          weekStart:
            "A weekly report already exists for this athlete and week.",
        },
        status: "duplicate",
      };
    }
    const now = new Date().toISOString();
    const report = {
      ...valid.input,
      createdAt: now,
      id: crypto.randomUUID(),
      updatedAt: now,
    } satisfies WeeklyPerformanceReport;
    write(WEEKLY_KEY, [report, ...reports]);
    return { report, status: "saved" };
  },
  getMonthly: (id) =>
    read(MONTHLY_KEY, monthlyReportSchema).find((report) => report.id === id),
  getWeekly: (id) =>
    read(WEEKLY_KEY, weeklyReportSchema).find((report) => report.id === id),
  listMonthly: () =>
    sortByDate(read(MONTHLY_KEY, monthlyReportSchema), "month"),
  listWeekly: () =>
    sortByDate(read(WEEKLY_KEY, weeklyReportSchema), "weekStart"),
  updateMonthly: (id, input) => {
    const valid = validateMonthly(input);
    if (!valid.valid) {
      return invalid<MonthlyPerformanceReport>(valid.fieldErrors);
    }
    const reports = read(MONTHLY_KEY, monthlyReportSchema);
    const existing = reports.find((report) => report.id === id);
    if (!existing) {
      return {
        fieldErrors: { form: "Monthly report not found." },
        status: "not-found",
      };
    }
    if (
      reports.some(
        (report) =>
          report.id !== id &&
          report.athleteId === valid.input.athleteId &&
          report.month === valid.input.month
      )
    ) {
      return {
        fieldErrors: {
          month: "A monthly report already exists for this athlete and month.",
        },
        status: "duplicate",
      };
    }
    const updated = {
      ...existing,
      ...valid.input,
      updatedAt: new Date().toISOString(),
    } satisfies MonthlyPerformanceReport;
    write(
      MONTHLY_KEY,
      reports.map((report) => (report.id === id ? updated : report))
    );
    return { report: updated, status: "saved" };
  },
  updateWeekly: (id, input) => {
    const valid = validateWeekly(input);
    if (!valid.valid) {
      return invalid<WeeklyPerformanceReport>(valid.fieldErrors);
    }
    const reports = read(WEEKLY_KEY, weeklyReportSchema);
    const existing = reports.find((report) => report.id === id);
    if (!existing) {
      return {
        fieldErrors: { form: "Weekly report not found." },
        status: "not-found",
      };
    }
    if (
      reports.some(
        (report) =>
          report.id !== id &&
          report.athleteId === valid.input.athleteId &&
          report.weekStart === valid.input.weekStart
      )
    ) {
      return {
        fieldErrors: {
          weekStart:
            "A weekly report already exists for this athlete and week.",
        },
        status: "duplicate",
      };
    }
    const updated = {
      ...existing,
      ...valid.input,
      updatedAt: new Date().toISOString(),
    } satisfies WeeklyPerformanceReport;
    write(
      WEEKLY_KEY,
      reports.map((report) => (report.id === id ? updated : report))
    );
    return { report: updated, status: "saved" };
  },
};
