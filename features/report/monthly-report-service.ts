import type { Collections } from "../../electron/collections";
import { createCollectionService } from "../../lib/collection-service";
import type { CollectionService } from "../../lib/collection-service";
import { monthlyReportInputSchema, monthlyReportSchema } from "./report-types";
import type { MonthlyPerformanceReport } from "./report-types";

export type MonthlyReportService = CollectionService<MonthlyPerformanceReport>;

export const createMonthlyReportService = (
  collections: Collections
): MonthlyReportService => {
  const collection = collections.monthlyReports;
  return createCollectionService({
    archive: collection.archive,
    duplicateFieldErrors: {
      month: "A monthly report already exists for this athlete and month.",
    },
    get: collection.get,
    identify: (record) => record.id,
    inputSchema: monthlyReportInputSchema,
    list: collection.list,
    make: (input, identity) => ({ ...input, ...identity }),
    merge: (existing, input, updatedAt) => ({
      ...existing,
      ...input,
      updatedAt,
    }),
    normalize: (input) => ({
      ...input,
      actionItems: input.actionItems.flatMap((item) =>
        item.trim() ? [item.trim()] : []
      ),
      coachSummary: input.coachSummary.trim(),
      exceptionReason: input.exceptionReason.trim(),
      performanceHighlights: input.performanceHighlights.trim(),
    }),
    notFoundMessage: "Monthly report not found.",
    recordSchema: monthlyReportSchema,
    restore: collection.restore,
    save: (report) =>
      collection.save({
        athleteId: report.athleteId,
        id: report.id,
        month: report.month,
        snapshot: JSON.stringify(report),
      }),
  });
};
